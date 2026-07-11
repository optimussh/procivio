"""Interview campaign P3."""

from __future__ import annotations

from fastapi.testclient import TestClient

_seq = 0


def _map_id(client: TestClient) -> int:
    global _seq
    _seq += 1
    r = client.post(
        "/api/maps",
        json={"owning_department": "Owning Anchor Division", "name": f"iv map {_seq}"},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_campaign_create_and_public_submit(client: TestClient) -> None:
    mid = _map_id(client)
    r = client.post(
        f"/api/maps/{mid}/interview-campaigns",
        json={"title": "Sales discovery"},
    )
    assert r.status_code == 200, r.text
    camp = r.json()
    assert camp["token"]
    assert camp["share_path"].startswith("/interview/")
    assert len(camp["questions"]) >= 3

    pub = client.get(f"/api/interview/c/{camp['token']}")
    assert pub.status_code == 200
    assert pub.json()["title"] == "Sales discovery"

    sub = client.post(
        f"/api/interview/c/{camp['token']}/responses",
        json={
            "respondent_name": "Kim",
            "answers": {"scope": "Order to cash", "steps": "A-B-C"},
        },
    )
    assert sub.status_code == 200, sub.text

    syn = client.post(f"/api/interview-campaigns/{camp['id']}/synthesize")
    assert syn.status_code == 200, syn.text
    body = syn.json()
    assert body["response_count"] == 1
    assert "Order to cash" in body["transcript"]
    assert "Kim" in body["transcript"]
