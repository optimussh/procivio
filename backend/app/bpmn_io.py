"""BPMN 2.0 subset export/import — Procivio graph ↔ XML (design P1).

Supported:
  startEvent, endEvent, task, exclusiveGateway, callActivity (subprocess)
  sequenceFlow, BPMNShape/BPMNEdge DI (coordinates)

No pools/lanes/messages/timers in P0/P1 subset.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from xml.dom import minidom

from app.schemas import EdgeIn, GraphOut, NodeOut

BPMN_NS = "http://www.omg.org/spec/BPMN/20100524/MODEL"
BPMNDI_NS = "http://www.omg.org/spec/BPMN/20100524/DI"
DC_NS = "http://www.omg.org/spec/DD/20100524/DC"
DI_NS = "http://www.omg.org/spec/DD/20100524/DI"

ET.register_namespace("bpmn", BPMN_NS)
ET.register_namespace("bpmndi", BPMNDI_NS)
ET.register_namespace("dc", DC_NS)
ET.register_namespace("di", DI_NS)

# Approximate node sizes for DI (flow units ≈ px)
_SIZE: dict[str, tuple[float, float]] = {
    "start": (36.0, 36.0),
    "end": (36.0, 36.0),
    "process": (120.0, 80.0),
    "decision": (50.0, 50.0),
    "subprocess": (140.0, 80.0),
    "task": (120.0, 80.0),  # legacy seed type
}


def _size(node_type: str) -> tuple[float, float]:
    return _SIZE.get(node_type, (120.0, 80.0))


def _xml_id(raw: str) -> str:
    """BPMN ids: letter start, alphanumeric/_-."""
    s = "".join(c if c.isalnum() or c in "_-" else "_" for c in raw)
    if not s or s[0].isdigit():
        s = "n_" + s
    return s[:200]


def graph_to_bpmn_xml(graph: GraphOut, process_name: str = "Process") -> str:
    """Procivio GraphOut → BPMN 2.0 XML string (UTF-8)."""
    defs = ET.Element(f"{{{BPMN_NS}}}definitions")
    defs.set("id", "Definitions_1")
    defs.set("targetNamespace", "https://procivio.local/bpmn")
    defs.set("exporter", "false")

    process = ET.SubElement(defs, f"{{{BPMN_NS}}}process")
    process.set("id", "Process_1")
    process.set("name", process_name[:200] or "Process")
    process.set("isExecutable", "false")

    plane = ET.SubElement(
        ET.SubElement(defs, f"{{{BPMNDI_NS}}}BPMNDiagram", {"id": "BPMNDiagram_1"}),
        f"{{{BPMNDI_NS}}}BPMNPlane",
        {"id": "BPMNPlane_1", "bpmnElement": "Process_1"},
    )

    id_map: dict[str, str] = {}
    for node in graph.nodes:
        bid = _xml_id(node.id)
        id_map[node.id] = bid
        nt = node.node_type or "process"
        if nt == "start":
            el = ET.SubElement(process, f"{{{BPMN_NS}}}startEvent")
        elif nt == "end":
            el = ET.SubElement(process, f"{{{BPMN_NS}}}endEvent")
        elif nt == "decision":
            el = ET.SubElement(process, f"{{{BPMN_NS}}}exclusiveGateway")
            el.set("gatewayDirection", "Unspecified")
        elif nt == "subprocess":
            el = ET.SubElement(process, f"{{{BPMN_NS}}}callActivity")
            if node.linked_map_id is not None:
                el.set("calledElement", f"map:{node.linked_map_id}")
        else:
            el = ET.SubElement(process, f"{{{BPMN_NS}}}task")
        el.set("id", bid)
        el.set("name", (node.title or "")[:200])

        w, h = _size(nt)
        shape = ET.SubElement(
            plane,
            f"{{{BPMNDI_NS}}}BPMNShape",
            {"id": f"Shape_{bid}", "bpmnElement": bid},
        )
        bounds = ET.SubElement(shape, f"{{{DC_NS}}}Bounds")
        bounds.set("x", str(float(node.pos_x)))
        bounds.set("y", str(float(node.pos_y)))
        bounds.set("width", str(w))
        bounds.set("height", str(h))

    for i, edge in enumerate(graph.edges):
        src = id_map.get(edge.source_node_id)
        tgt = id_map.get(edge.target_node_id)
        if not src or not tgt:
            continue
        fid = _xml_id(edge.id or f"Flow_{i}")
        flow = ET.SubElement(process, f"{{{BPMN_NS}}}sequenceFlow")
        flow.set("id", fid)
        flow.set("sourceRef", src)
        flow.set("targetRef", tgt)
        if edge.label:
            flow.set("name", edge.label[:200])

        # Waypoints: source center-right → target center-left
        sn = next((n for n in graph.nodes if n.id == edge.source_node_id), None)
        tn = next((n for n in graph.nodes if n.id == edge.target_node_id), None)
        if sn and tn:
            sw, sh = _size(sn.node_type)
            tw, th = _size(tn.node_type)
            edge_el = ET.SubElement(
                plane,
                f"{{{BPMNDI_NS}}}BPMNEdge",
                {"id": f"Edge_{fid}", "bpmnElement": fid},
            )
            for x, y in (
                (sn.pos_x + sw, sn.pos_y + sh / 2),
                (tn.pos_x, tn.pos_y + th / 2),
            ):
                wp = ET.SubElement(edge_el, f"{{{DI_NS}}}waypoint")
                wp.set("x", str(x))
                wp.set("y", str(y))

    rough = ET.tostring(defs, encoding="utf-8")
    pretty = minidom.parseString(rough).toprettyxml(indent="  ", encoding="utf-8")
    # minidom adds XML declaration
    return pretty.decode("utf-8")


def _local(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def _find_bounds(shape: ET.Element) -> tuple[float, float]:
    for child in shape.iter():
        if _local(child.tag) == "Bounds":
            try:
                return float(child.get("x") or 0), float(child.get("y") or 0)
            except ValueError:
                return 0.0, 0.0
    return 0.0, 0.0


def bpmn_xml_to_graph(xml_text: str) -> GraphOut:
    """BPMN 2.0 subset XML → GraphOut (ids preserved when legal)."""
    root = ET.fromstring(xml_text.encode("utf-8") if isinstance(xml_text, str) else xml_text)
    # Collect DI positions: bpmnElement id → (x,y)
    positions: dict[str, tuple[float, float]] = {}
    for el in root.iter():
        if _local(el.tag) == "BPMNShape":
            ref = el.get("bpmnElement") or ""
            positions[ref] = _find_bounds(el)

    nodes: list[NodeOut] = []
    node_types: dict[str, str] = {}
    sort_i = 0
    for el in root.iter():
        tag = _local(el.tag)
        nt: str | None = None
        if tag == "startEvent":
            nt = "start"
        elif tag == "endEvent":
            nt = "end"
        elif tag == "exclusiveGateway" or tag == "parallelGateway" or tag == "inclusiveGateway":
            nt = "decision"
        elif tag == "callActivity":
            nt = "subprocess"
        elif tag in ("task", "userTask", "serviceTask", "manualTask", "scriptTask"):
            nt = "process"
        if nt is None:
            continue
        eid = el.get("id") or f"n{sort_i}"
        name = el.get("name") or tag
        x, y = positions.get(eid, (80.0 + sort_i * 40, 200.0))
        linked: int | None = None
        if nt == "subprocess":
            called = el.get("calledElement") or ""
            if called.startswith("map:"):
                try:
                    linked = int(called.split(":", 1)[1])
                except ValueError:
                    linked = None
        nodes.append(
            NodeOut(
                id=eid[:50],
                title=name[:200],
                description="",
                node_type=nt,
                pos_x=x,
                pos_y=y,
                sort_order=sort_i,
                linked_map_id=linked,
                follow_latest=bool(linked is not None),
            )
        )
        node_types[eid] = nt
        sort_i += 1

    node_ids = {n.id for n in nodes}
    edges: list[EdgeIn] = []
    ei = 0
    for el in root.iter():
        if _local(el.tag) != "sequenceFlow":
            continue
        src = el.get("sourceRef") or ""
        tgt = el.get("targetRef") or ""
        if src not in node_ids or tgt not in node_ids:
            continue
        fid = (el.get("id") or f"e{ei}")[:50]
        edges.append(
            EdgeIn(
                id=fid,
                source_node_id=src[:50],
                target_node_id=tgt[:50],
                label=(el.get("name") or "")[:200],
                source_side="right",
                target_side="left",
            )
        )
        ei += 1

    if not nodes:
        raise ValueError("no supported BPMN flow nodes found")

    return GraphOut(nodes=nodes, edges=edges, groups=[])
