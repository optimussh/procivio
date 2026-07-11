"""Structure tree + parent validation (roadmap Phase A)."""

from __future__ import annotations

from fastapi.testclient import TestClient


def _create(
    client: TestClient,
    name: str,
    level: int,
    parent_id: int | None = None,
    dept: str = "Owning Anchor Division",
) -> dict:
    body: dict = {
        "name": name,
        "description": "",
        "visibility": "private",
        "owning_department": dept,
        "workflow_level": level,
        "parent_map_id": parent_id,
    }
    resp = client.post("/api/maps", json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_structure_tree_nests_children(client: TestClient) -> None:
    domain = _create(client, "Struct Domain A", 1)
    process = _create(client, "Struct Process A", 3, parent_id=domain["id"])
    tree = client.get("/api/maps/structure").json()
    roots = tree["roots"]
    # Find our domain among roots (other seed maps may exist)
    domain_node = next((r for r in roots if r["id"] == domain["id"]), None)
    assert domain_node is not None
    child_ids = [c["id"] for c in domain_node["children"]]
    assert process["id"] in child_ids


def test_parent_level_must_be_above(client: TestClient) -> None:
    low = _create(client, "Struct Low L5", 5)
    resp = client.post(
        "/api/maps",
        json={
            "name": "Struct Bad Parent",
            "description": "",
            "visibility": "private",
            "owning_department": "Owning Anchor Division",
            "workflow_level": 3,
            "parent_map_id": low["id"],
        },
    )
    assert resp.status_code == 400


def test_patch_parent_and_level(client: TestClient) -> None:
    d = _create(client, "Struct Patch Domain", 1)
    p = _create(client, "Struct Patch Process", 3)
    resp = client.patch(
        f"/api/maps/{p['id']}",
        json={"parent_map_id": d["id"], "workflow_level": 3},
    )
    assert resp.status_code == 200
    assert resp.json()["parent_map_id"] == d["id"]
    assert resp.json()["workflow_level"] == 3


def test_self_parent_rejected(client: TestClient) -> None:
    m = _create(client, "Struct Self", 3)
    resp = client.patch(f"/api/maps/{m['id']}", json={"parent_map_id": m["id"]})
    assert resp.status_code == 400
