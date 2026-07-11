"""BPMN 2.0 subset export/import (P1)."""

from __future__ import annotations

from app.bpmn_io import bpmn_xml_to_graph, graph_to_bpmn_xml
from app.schemas import EdgeIn, GraphOut, NodeOut


def _sample_graph() -> GraphOut:
    return GraphOut(
        nodes=[
            NodeOut(id="s1", title="Start", node_type="start", pos_x=0, pos_y=100, sort_order=0),
            NodeOut(id="p1", title="Review", node_type="process", pos_x=200, pos_y=100, sort_order=1),
            NodeOut(id="d1", title="OK?", node_type="decision", pos_x=400, pos_y=100, sort_order=2),
            NodeOut(
                id="e1",
                title="End",
                node_type="end",
                pos_x=600,
                pos_y=100,
                sort_order=3,
                is_primary_end=True,
            ),
        ],
        edges=[
            EdgeIn(id="f1", source_node_id="s1", target_node_id="p1"),
            EdgeIn(id="f2", source_node_id="p1", target_node_id="d1"),
            EdgeIn(id="f3", source_node_id="d1", target_node_id="e1", label="Yes"),
        ],
        groups=[],
    )


def test_export_contains_bpmn_elements() -> None:
    xml = graph_to_bpmn_xml(_sample_graph(), process_name="Demo")
    assert "definitions" in xml
    assert "startEvent" in xml
    assert "task" in xml or "name=\"Review\"" in xml
    assert "exclusiveGateway" in xml
    assert "endEvent" in xml
    assert "sequenceFlow" in xml
    assert "BPMNShape" in xml
    assert "Review" in xml


def test_roundtrip_export_import() -> None:
    xml = graph_to_bpmn_xml(_sample_graph(), process_name="Round")
    g2 = bpmn_xml_to_graph(xml)
    types = {n.node_type for n in g2.nodes}
    assert "start" in types
    assert "end" in types
    assert "process" in types
    assert "decision" in types
    assert len(g2.edges) >= 2
    titles = {n.title for n in g2.nodes}
    assert "Review" in titles


def test_import_rejects_empty() -> None:
    try:
        bpmn_xml_to_graph(
            '<?xml version="1.0"?><definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"/>'
        )
        raise AssertionError("expected ValueError")
    except ValueError as exc:
        assert "no supported" in str(exc).lower() or "no" in str(exc).lower()
