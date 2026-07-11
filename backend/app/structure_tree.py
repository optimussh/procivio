"""Build Structure tree from ProcessMap rows (parent_map_id + workflow_level).

Industry is NOT a workflow level — it is a catalog tag for demo grouping
(stored as description first line: ``industry:<label>``).
"""

from __future__ import annotations

from app.models import ProcessMap
from app.schemas import StructureIndustryGroupOut, StructureMapNodeOut, StructureTreeOut

INDUSTRY_PREFIX = "industry:"


def parse_industry(description: str | None) -> str | None:
    """Extract catalog industry label from map description (first line)."""
    if not description:
        return None
    first = description.split("\n", 1)[0].strip()
    if first.startswith(INDUSTRY_PREFIX):
        label = first[len(INDUSTRY_PREFIX) :].strip()
        return label or None
    return None


def build_structure_tree(maps: list[ProcessMap]) -> list[StructureMapNodeOut]:
    """Flat visible maps → nested tree by parent_map_id (orphans become roots)."""
    by_id = {
        m.id: StructureMapNodeOut(
            id=m.id,
            name=m.name,
            workflow_level=m.workflow_level if m.workflow_level is not None else 3,
            parent_map_id=m.parent_map_id,
            industry=parse_industry(getattr(m, "description", None)),
            children=[],
        )
        for m in maps
    }
    roots: list[StructureMapNodeOut] = []
    for node in by_id.values():
        pid = node.parent_map_id
        if pid is not None and pid in by_id:
            by_id[pid].children.append(node)
        else:
            roots.append(node)

    def sort_rec(nodes: list[StructureMapNodeOut]) -> None:
        nodes.sort(key=lambda n: (n.workflow_level, n.name.lower()))
        for n in nodes:
            sort_rec(n.children)

    sort_rec(roots)
    return roots


def build_structure_response(maps: list[ProcessMap]) -> StructureTreeOut:
    """Tree roots + industry catalog groups (for Structure page sections)."""
    roots = build_structure_tree(maps)
    # Group L1 roots by industry tag; untagged → "Other"
    buckets: dict[str, list[StructureMapNodeOut]] = {}
    for r in roots:
        key = r.industry or "Other / 기타"
        buckets.setdefault(key, []).append(r)
    # Prefer known demo order, then alpha
    preferred = [
        "Antibody Therapeutics / 항체 의약품",
        "Memory Semiconductor / 메모리 반도체",
        "EV Battery / 이차전지",
    ]
    ordered_names = [n for n in preferred if n in buckets] + sorted(
        k for k in buckets if k not in preferred
    )
    industries = [
        StructureIndustryGroupOut(name=name, roots=buckets[name])
        for name in ordered_names
    ]
    return StructureTreeOut(roots=roots, industries=industries)
