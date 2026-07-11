"""Architecture ontology helpers — O1 gaps, O3 relation rules (design 2026-07-11)."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from app.models import ArchitectureRelation, Concept, MapVersion, Node, ProcessMap

# Frozen relation types (commercial ceiling O3)
RELATION_TYPES = frozenset(
    {"contains", "realizes", "calls", "variant_of", "uses", "owned_by"}
)

SEVERITY_ORDER = {"error": 0, "warn": 1, "info": 2}


@dataclass
class GapIssue:
    kind: str
    severity: str
    map_id: int | None
    map_name: str
    related_map_id: int | None = None
    related_map_name: str | None = None
    message: str = ""


def _name(maps: dict[int, ProcessMap], mid: int | None) -> str:
    if mid is None:
        return ""
    m = maps.get(mid)
    return m.name if m is not None else f"#{mid}"


def collect_call_edges(
    maps: dict[int, ProcessMap],
    versions_by_map: dict[int, list[MapVersion]],
    nodes_by_version: dict[int, list[Node]],
) -> list[tuple[int, int, int, str]]:
    """Return (host_map_id, target_map_id, host_version_id, node_title) for CA edges.

    Uses the highest version id per host map (any status) as representative graph.
    """
    edges: list[tuple[int, int, int, str]] = []
    for mid, versions in versions_by_map.items():
        if mid not in maps or not versions:
            continue
        latest = max(versions, key=lambda v: v.id)
        for node in nodes_by_version.get(latest.id, []):
            lid = node.linked_map_id
            if lid is None:
                continue
            if (node.node_type or "") == "subprocess" or lid is not None:
                edges.append((mid, int(lid), latest.id, node.title or node.id))
    return edges


def compute_gaps(
    maps: list[ProcessMap],
    *,
    versions: list[MapVersion],
    nodes: list[Node],
    concepts: list[Concept] | None = None,
) -> list[GapIssue]:
    """O1 gap report over visible maps + their graphs + optional concepts."""
    by_id = {m.id: m for m in maps if m.deleted_at is None}
    versions_by_map: dict[int, list[MapVersion]] = defaultdict(list)
    for v in versions:
        if v.map_id in by_id:
            versions_by_map[v.map_id].append(v)
    nodes_by_version: dict[int, list[Node]] = defaultdict(list)
    for n in nodes:
        nodes_by_version[n.version_id].append(n)

    issues: list[GapIssue] = []
    call_edges = collect_call_edges(by_id, versions_by_map, nodes_by_version)
    # parent → set of tree children
    children: dict[int, list[int]] = defaultdict(list)
    for m in by_id.values():
        if m.parent_map_id is not None:
            children[m.parent_map_id].append(m.id)

    # host → set of called map ids
    calls_from: dict[int, set[int]] = defaultdict(set)
    callers_of: dict[int, set[int]] = defaultdict(set)
    for host, target, _vid, _title in call_edges:
        calls_from[host].add(target)
        callers_of[target].add(host)

    for m in by_id.values():
        level = m.workflow_level if m.workflow_level is not None else 3
        # missing_parent
        if level >= 2 and m.parent_map_id is None:
            issues.append(
                GapIssue(
                    kind="missing_parent",
                    severity="warn",
                    map_id=m.id,
                    map_name=m.name,
                    message=f"L{level} map has no parent in the structure tree",
                )
            )
        # orphan_parent
        if m.parent_map_id is not None and m.parent_map_id not in by_id:
            issues.append(
                GapIssue(
                    kind="orphan_parent",
                    severity="error",
                    map_id=m.id,
                    map_name=m.name,
                    related_map_id=m.parent_map_id,
                    related_map_name=_name(by_id, m.parent_map_id),
                    message="parent_map_id points to missing or inaccessible map",
                )
            )
        # level_skip
        if m.parent_map_id is not None and m.parent_map_id in by_id:
            p = by_id[m.parent_map_id]
            pl = p.workflow_level if p.workflow_level is not None else 3
            if pl + 1 < level:
                issues.append(
                    GapIssue(
                        kind="level_skip",
                        severity="info",
                        map_id=m.id,
                        map_name=m.name,
                        related_map_id=p.id,
                        related_map_name=p.name,
                        message=f"level skip L{pl} → L{level}",
                    )
                )
            # tree_without_call: child under P but P's graph never calls child
            if m.id not in calls_from.get(p.id, set()):
                # only if parent has any version/graph worth checking
                if versions_by_map.get(p.id):
                    issues.append(
                        GapIssue(
                            kind="tree_without_call",
                            severity="warn",
                            map_id=m.id,
                            map_name=m.name,
                            related_map_id=p.id,
                            related_map_name=p.name,
                            message=(
                                "in structure under parent, but parent map graph "
                                "has no Call Activity to this map"
                            ),
                        )
                    )

    for host, target, _vid, title in call_edges:
        tmap = by_id.get(target)
        hmap = by_id.get(host)
        if hmap is None:
            continue
        if tmap is None:
            issues.append(
                GapIssue(
                    kind="call_target_missing",
                    severity="error",
                    map_id=host,
                    map_name=hmap.name,
                    related_map_id=target,
                    related_map_name=f"#{target}",
                    message=f"Call Activity «{title}» targets missing/deleted map",
                )
            )
            continue
        if tmap.sp_designated_at is None:
            issues.append(
                GapIssue(
                    kind="call_target_undesignated",
                    severity="warn",
                    map_id=host,
                    map_name=hmap.name,
                    related_map_id=target,
                    related_map_name=tmap.name,
                    message=f"Call «{title}» → undesignated subprocess library map",
                )
            )
        # call_without_tree
        if tmap.parent_map_id != host:
            issues.append(
                GapIssue(
                    kind="call_without_tree",
                    severity="info",
                    map_id=host,
                    map_name=hmap.name,
                    related_map_id=target,
                    related_map_name=tmap.name,
                    message=(
                        "Call Activity target is not a structure child of this map "
                        f"(target parent={tmap.parent_map_id})"
                    ),
                )
            )

    if concepts:
        linked_cids = {m.concept_id for m in by_id.values() if m.concept_id is not None}
        for c in concepts:
            if c.status == "archived":
                continue
            if c.id not in linked_cids:
                issues.append(
                    GapIssue(
                        kind="concept_unlinked",
                        severity="info",
                        map_id=None,
                        map_name=c.name,
                        related_map_id=None,
                        message=f"concept «{c.name}» has no attached maps",
                    )
                )

    issues.sort(
        key=lambda i: (
            SEVERITY_ORDER.get(i.severity, 9),
            i.kind,
            i.map_name.lower(),
        )
    )
    return issues


def relation_endpoints_ok(
    *,
    source_map_id: int | None,
    target_map_id: int | None,
    source_concept_id: int | None,
    target_concept_id: int | None,
) -> str | None:
    """Return error detail or None if endpoints valid."""
    src = (source_map_id is not None) + (source_concept_id is not None)
    tgt = (target_map_id is not None) + (target_concept_id is not None)
    if src != 1:
        return "exactly one of source_map_id or source_concept_id required"
    if tgt != 1:
        return "exactly one of target_map_id or target_concept_id required"
    if (
        source_map_id is not None
        and target_map_id is not None
        and source_map_id == target_map_id
    ):
        return "source and target map cannot be the same"
    if (
        source_concept_id is not None
        and target_concept_id is not None
        and source_concept_id == target_concept_id
    ):
        return "source and target concept cannot be the same"
    return None


def same_relation(a: ArchitectureRelation, b: ArchitectureRelation) -> bool:
    return (
        a.relation_type == b.relation_type
        and a.source_map_id == b.source_map_id
        and a.target_map_id == b.target_map_id
        and a.source_concept_id == b.source_concept_id
        and a.target_concept_id == b.target_concept_id
    )
