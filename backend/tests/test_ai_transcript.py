"""트랜스크립트 → 맵 초안 (design 2026-07-11 interview-transcript-map)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app import ai_client
from app.ai_prompt import build_transcript_generate_messages
from app.schemas import GraphOut
from app.settings import settings

_tx_seq = 0


def test_build_transcript_messages_includes_text_and_rules() -> None:
    graph = GraphOut(nodes=[], edges=[], groups=[])
    msgs = build_transcript_generate_messages(
        manual="MANUAL",
        current_graph=graph,
        can_edit=True,
        transcript="시작은 요청 접수, 그다음 검토, 승인 후 종료. 금액 크면 팀장 승인.",
        focus="구매 발주만",
        industry_hint="antibody",
    )
    assert msgs[0]["role"] == "system"
    blob = "\n".join(m["content"] for m in msgs)
    assert "kind=graph" in blob or "graph" in msgs[0]["content"]
    user = msgs[-1]["content"]
    assert "요청 접수" in user
    assert "구매 발주만" in user
    assert "지어내지" in blob or "명시" in blob
    assert "항체" in user or "mAb" in user


def _enable_ai(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_enabled", True)


def _draft_checked_out(client: TestClient) -> int:
    global _tx_seq
    _tx_seq += 1
    created = client.post(
        "/api/maps",
        json={
            "owning_department": "Owning Anchor Division",
            "name": f"transcript map {_tx_seq}",
        },
    )
    assert created.status_code == 201, created.text
    version_id = created.json()["versions"][0]["id"]
    client.post(f"/api/versions/{version_id}/checkout", json={})
    return version_id


def test_transcript_too_short_400(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _enable_ai(monkeypatch)
    vid = _draft_checked_out(client)
    r = client.post(
        f"/api/versions/{vid}/ai/from-transcript",
        json={"transcript": "짧음"},
    )
    assert r.status_code == 400
    assert "80" in r.text or "short" in r.text.lower() or "짧" in r.text


def test_transcript_too_long_400(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _enable_ai(monkeypatch)
    monkeypatch.setattr(settings, "ai_transcript_max_chars", 100)
    vid = _draft_checked_out(client)
    r = client.post(
        f"/api/versions/{vid}/ai/from-transcript",
        json={"transcript": "가" * 101},
    )
    assert r.status_code == 400


def test_transcript_generate_graph(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _enable_ai(monkeypatch)
    graph_json = (
        '{"kind":"graph","message":"ok","nodes":['
        '{"key":"s","title":"Start","node_type":"start","description":"","attributes":{}},'
        '{"key":"p","title":"검토","node_type":"process","description":"","attributes":{}},'
        '{"key":"e","title":"End","node_type":"end","description":"","attributes":{}}'
        '],"edges":[{"source":"s","target":"p","label":""},{"source":"p","target":"e","label":""}],'
        '"groups":[]}'
    )

    async def _fake(messages, model=None):  # noqa: ANN001, ARG001
        return ai_client.AiReply(content=graph_json, prompt_tokens=10, completion_tokens=20)

    monkeypatch.setattr(ai_client, "call_ai", _fake)
    vid = _draft_checked_out(client)
    body = {
        "transcript": "프로세스는 요청으로 시작해 검토 후 끝난다. " * 5,
        "focus": "",
        "industry_hint": "none",
    }
    r = client.post(f"/api/versions/{vid}/ai/from-transcript", json=body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["kind"] == "graph"
    assert len(data["nodes"]) >= 3
