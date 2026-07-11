"""Inquire MVP — 인터뷰 진행(로컬) + generate 분기 (design 2026-07-11)."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app import ai_client
from app.ai_prompt import (
    INQUIRE_GENERATE_TOKEN,
    INQUIRE_SCRIPT,
    INQUIRE_START_TOKEN,
    advance_inquire,
    build_inquire_generate_messages,
    inquire_question_text,
)
from app.schemas import GraphOut
from app.settings import settings


def test_advance_inquire_start() -> None:
    answers, next_step, msg, done = advance_inquire(
        step=None, answers={}, instruction=INQUIRE_START_TOKEN
    )
    assert done is False
    assert next_step == 0
    assert answers == {}
    assert "질문 1/5" in msg
    assert "이름" in msg or "목적" in msg


def test_advance_inquire_through_all_steps() -> None:
    answers: dict[str, str] = {}
    step: int | None = 0
    for i, (key, _) in enumerate(INQUIRE_SCRIPT):
        answers, step, msg, done = advance_inquire(
            step=i, answers=answers, instruction=f"답변-{key}"
        )
        assert key in answers
        if i < len(INQUIRE_SCRIPT) - 1:
            assert done is False
            assert f"질문 {i + 2}/5" in msg
        else:
            assert done is True
            assert "초안 생성" in msg


def test_build_inquire_generate_messages_includes_answers() -> None:
    graph = GraphOut(nodes=[], edges=[], groups=[])
    msgs = build_inquire_generate_messages(
        manual="MANUAL",
        current_graph=graph,
        can_edit=True,
        answers={"scope": "구매 발주", "steps": "요청-승인-발주"},
    )
    assert msgs[0]["role"] == "system"
    assert "구매 발주" in msgs[1]["content"]
    assert "kind=graph" in msgs[1]["content"]


def test_inquire_question_text_bounds() -> None:
    assert inquire_question_text(-1) == ""
    assert "1/5" in inquire_question_text(0)
    assert inquire_question_text(99) == ""


def _enable_ai(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_enabled", True)


_inq_seq = 0


def _draft_checked_out(client: TestClient) -> int:
    global _inq_seq
    _inq_seq += 1
    created = client.post(
        "/api/maps",
        json={
            "owning_department": "Owning Anchor Division",
            "name": f"inquire map {_inq_seq}",
        },
    ).json()
    version_id = created["versions"][0]["id"]
    client.post(f"/api/versions/{version_id}/checkout", json={})
    return version_id


def test_ai_chat_inquire_start_no_llm(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """시작 토큰은 LLM 없이 첫 질문 반환."""
    _enable_ai(monkeypatch)
    version_id = _draft_checked_out(client)

    called = {"n": 0}

    async def _boom(*_a: object, **_k: object) -> ai_client.AiReply:
        called["n"] += 1
        raise AssertionError("LLM must not be called for inquire start")

    monkeypatch.setattr(ai_client, "call_ai", _boom)

    resp = client.post(
        f"/api/versions/{version_id}/ai/chat",
        json={
            "instruction": INQUIRE_START_TOKEN,
            "inquire_mode": True,
            "inquire_step": 0,
            "inquire_answers": {},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["kind"] == "answer"
    assert body["inquire_done"] is False
    assert "질문 1/5" in body["message"]
    assert called["n"] == 0


def test_ai_chat_inquire_answer_advances(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_ai(monkeypatch)
    version_id = _draft_checked_out(client)

    resp = client.post(
        f"/api/versions/{version_id}/ai/chat",
        json={
            "instruction": "구매 발주 프로세스",
            "inquire_mode": True,
            "inquire_step": 0,
            "inquire_answers": {},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["inquire_answers"].get("scope") == "구매 발주 프로세스"
    assert body["inquire_next_step"] == 1
    assert "질문 2/5" in body["message"]


def test_ai_chat_inquire_generate_calls_llm(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_ai(monkeypatch)
    version_id = _draft_checked_out(client)

    graph_json = json.dumps(
        {
            "kind": "graph",
            "message": "초안",
            "nodes": [
                {"key": "s", "title": "시작", "node_type": "start"},
                {"key": "p", "title": "검토", "node_type": "process"},
                {"key": "e", "title": "끝", "node_type": "end"},
            ],
            "edges": [
                {"source": "s", "target": "p", "label": ""},
                {"source": "p", "target": "e", "label": ""},
            ],
        }
    )

    async def _fake(messages: list[dict], model: str | None = None) -> ai_client.AiReply:
        assert any("인터뷰 답변" in m.get("content", "") for m in messages)
        return ai_client.AiReply(content=graph_json, prompt_tokens=10, completion_tokens=20)

    monkeypatch.setattr(ai_client, "call_ai", _fake)

    resp = client.post(
        f"/api/versions/{version_id}/ai/chat",
        json={
            "instruction": INQUIRE_GENERATE_TOKEN,
            "inquire_mode": True,
            "inquire_answers": {
                "scope": "구매",
                "steps": "요청, 승인, 발주",
            },
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["kind"] == "graph"
    assert len(body["nodes"]) == 3


def test_ai_chat_inquire_generate_requires_answers(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _enable_ai(monkeypatch)
    version_id = _draft_checked_out(client)
    resp = client.post(
        f"/api/versions/{version_id}/ai/chat",
        json={
            "instruction": INQUIRE_GENERATE_TOKEN,
            "inquire_mode": True,
            "inquire_answers": {},
        },
    )
    assert resp.status_code == 400
