"""Build Structure tree from ProcessMap rows (parent_map_id + workflow_level)."""

from __future__ import annotations

from app.models import ProcessMap
from app.schemas import StructureMapNodeOut


def build_structure_tree(maps: list[ProcessMap]) -> list[StructureMapNodeOut]:
    """Flat visible maps → nested tree by parent_map_id (orphans become roots)."""
    by_id = {
        m.id: StructureMapNodeOut(
            id=m.id,
            name=m.name,
            workflow_level=m.workflow_level if m.workflow_level is not None else 3,
            parent_map_id=m.parent_map_id,
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
