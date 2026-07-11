"""Event-log mining MVP (P4)."""

from app.mining import event_log_csv_to_graph

_SAMPLE = """case_id,activity,timestamp
1,Receive,2024-01-01T10:00:00
1,Review,2024-01-01T11:00:00
1,Approve,2024-01-01T12:00:00
2,Receive,2024-01-02T10:00:00
2,Review,2024-01-02T11:00:00
2,Reject,2024-01-02T12:00:00
"""


def test_event_log_builds_graph() -> None:
    g = event_log_csv_to_graph(_SAMPLE)
    types = {n.node_type for n in g.nodes}
    assert "start" in types and "end" in types and "process" in types
    titles = {n.title for n in g.nodes}
    assert "Receive" in titles
    assert "Review" in titles
    assert len(g.edges) >= 2


def test_event_log_missing_columns() -> None:
    try:
        event_log_csv_to_graph("a,b\n1,2\n")
        raise AssertionError("expected ValueError")
    except ValueError as e:
        assert "case" in str(e).lower() or "activity" in str(e).lower()
