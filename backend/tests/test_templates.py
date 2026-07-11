"""Template maps — list, mark, instantiate (Phase B)."""

from __future__ import annotations

from fastapi.testclient import TestClient

_seq = 0


def _create_map(client: TestClient, name: str | None = None, level: int = 3) -> dict:
    global _seq
    _seq += 1
    resp = client.post(
        "/api/maps",
        json={
            "name": name or f"tpl map {_seq}",
            "description": "tmpl",
            "visibility": "public",
            "owning_department": "Owning Anchor Division",
            "workflow_level": level,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_mark_and_list_templates(client: TestClient) -> None:
    m = _create_map(client)
    r = client.patch(f"/api/maps/{m['id']}", json={"is_template": True})
    assert r.status_code == 200, r.text
    assert r.json()["is_template"] is True

    listed = client.get("/api/maps/templates")
    assert listed.status_code == 200, listed.text
    ids = {row["id"] for row in listed.json()}
    assert m["id"] in ids


def test_instantiate_from_template(client: TestClient) -> None:
    m = _create_map(client)
    client.patch(f"/api/maps/{m['id']}", json={"is_template": True})
    vid = m["versions"][0]["id"]
    client.post(f"/api/versions/{vid}/checkout", json={})
    save = client.put(
        f"/api/versions/{vid}/graph",
        json={
            "nodes": [
                {"id": "n1", "title": "Start", "node_type": "start", "pos_x": 0, "pos_y": 0}
            ],
            "edges": [],
        },
    )
    assert save.status_code == 200, save.text

    inst = client.post(
        f"/api/maps/{m['id']}/from-template",
        json={
            "name": f"from tpl {_seq}",
            "owning_department": "Owning Anchor Division",
            "description": "created from template",
            "visibility": "private",
        },
    )
    assert inst.status_code == 201, inst.text
    body = inst.json()
    assert body["is_template"] is False
    assert body["my_role"] == "owner"

    new_vid = body["versions"][0]["id"]
    graph = client.get(f"/api/versions/{new_vid}/graph")
    assert graph.status_code == 200, graph.text
    assert len(graph.json()["nodes"]) == 1
    assert graph.json()["nodes"][0]["title"] == "Start"


def test_from_template_rejects_non_template(client: TestClient) -> None:
    m = _create_map(client)
    resp = client.post(
        f"/api/maps/{m['id']}/from-template",
        json={
            "name": f"should fail {_seq}",
            "owning_department": "Owning Anchor Division",
        },
    )
    assert resp.status_code == 400
