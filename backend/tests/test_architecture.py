"""Architecture ontology O1–O3 tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

_seq = 0


def _map(
    client: TestClient,
    name: str,
    level: int = 3,
    parent_id: int | None = None,
) -> dict:
    global _seq
    _seq += 1
    body: dict = {
        "name": f"{name} {_seq}",
        "description": "",
        "visibility": "private",
        "owning_department": "Owning Anchor Division",
        "workflow_level": level,
        "parent_map_id": parent_id,
    }
    r = client.post("/api/maps", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_gaps_missing_parent(client: TestClient) -> None:
    m = _map(client, "Gap L3 no parent", level=3)
    gaps = client.get("/api/structure/gaps")
    assert gaps.status_code == 200, gaps.text
    kinds = [
        i
        for i in gaps.json()["issues"]
        if i["map_id"] == m["id"] and i["kind"] == "missing_parent"
    ]
    assert len(kinds) >= 1


def test_concept_create_and_attach(client: TestClient) -> None:
    c = client.post(
        "/api/concepts",
        json={"name": f"Concept PO {_seq}", "workflow_level": 2, "aliases": ["발주"]},
    )
    assert c.status_code == 200, c.text
    cid = c.json()["id"]
    m = _map(client, "Concept map", level=3)
    att = client.post(f"/api/maps/{m['id']}/concept", json={"concept_id": cid})
    assert att.status_code == 200, att.text
    listed = client.get("/api/concepts")
    assert listed.status_code == 200
    row = next(x for x in listed.json() if x["id"] == cid)
    assert row["map_count"] >= 1
    maps = client.get(f"/api/concepts/{cid}/maps")
    assert maps.status_code == 200
    assert any(x["id"] == m["id"] for x in maps.json())


def test_relation_and_callers(client: TestClient) -> None:
    parent = _map(client, "Arch parent", level=1)
    child = _map(client, "Arch child", level=3, parent_id=parent["id"])
    # explicit realizes relation (child realizes parent capability-ish)
    rel = client.post(
        "/api/architecture/relations",
        json={
            "relation_type": "realizes",
            "source_map_id": child["id"],
            "target_map_id": parent["id"],
            "note": "test",
        },
    )
    assert rel.status_code == 200, rel.text
    rid = rel.json()["id"]
    listed = client.get(f"/api/architecture/relations?map_id={child['id']}")
    assert listed.status_code == 200
    assert any(r["id"] == rid for r in listed.json())

    # graph with Call Activity on parent → child
    versions = client.get(f"/api/maps/{parent['id']}").json()["versions"]
    vid = versions[0]["id"]
    co = client.post(f"/api/versions/{vid}/checkout", json={})
    assert co.status_code == 200, co.text
    graph = {
        "nodes": [
            {
                "id": "start",
                "title": "Start",
                "node_type": "start",
                "pos_x": 0,
                "pos_y": 0,
                "sort_order": 0,
            },
            {
                "id": "sp1",
                "title": "Call child",
                "node_type": "subprocess",
                "pos_x": 200,
                "pos_y": 0,
                "sort_order": 1,
                "linked_map_id": child["id"],
                "follow_latest": True,
            },
            {
                "id": "end",
                "title": "End",
                "node_type": "end",
                "pos_x": 400,
                "pos_y": 0,
                "sort_order": 2,
                "is_primary_end": True,
            },
        ],
        "edges": [
            {
                "id": "e1",
                "source_node_id": "start",
                "target_node_id": "sp1",
            },
            {
                "id": "e2",
                "source_node_id": "sp1",
                "target_node_id": "end",
            },
        ],
        "groups": [],
    }
    put = client.put(f"/api/versions/{vid}/graph", json=graph)
    assert put.status_code == 200, put.text

    callers = client.get(f"/api/maps/{child['id']}/callers")
    assert callers.status_code == 200, callers.text
    assert any(c["map_id"] == parent["id"] for c in callers.json())

    arch = client.get(f"/api/maps/{parent['id']}/architecture")
    assert arch.status_code == 200, arch.text
    body = arch.json()
    assert child["id"] in body["derived_contains_children"]
    assert child["id"] in body["derived_calls"]

    # bad relation type
    bad = client.post(
        "/api/architecture/relations",
        json={
            "relation_type": "owl_magic",
            "source_map_id": child["id"],
            "target_map_id": parent["id"],
        },
    )
    assert bad.status_code == 400

    deleted = client.delete(f"/api/architecture/relations/{rid}")
    assert deleted.status_code == 200


def test_unit_compute_gaps_call_missing() -> None:
    from app.architecture import compute_gaps
    from app.models import MapVersion, Node, ProcessMap

    host = ProcessMap(
        id=1,
        name="Host",
        description="",
        workflow_level=3,
        parent_map_id=None,
    )
    # bypass ORM defaults for pure unit objects
    host.deleted_at = None
    host.sp_designated_at = None
    host.concept_id = None

    ver = MapVersion(id=10, map_id=1, label="v1", status="draft")
    node = Node(
        id="sp1",
        version_id=10,
        title="Broken call",
        node_type="subprocess",
        pos_x=0,
        pos_y=0,
        sort_order=0,
        linked_map_id=999,
    )
    issues = compute_gaps([host], versions=[ver], nodes=[node], concepts=[])
    kinds = {i.kind for i in issues}
    assert "call_target_missing" in kinds
    assert "missing_parent" in kinds
