"""AI 키·모델 캐스케이드 폴백 테스트."""

from __future__ import annotations

import asyncio

import httpx2
import pytest

from app import ai_client
from app.settings import settings


class _Resp:
    def __init__(self, status_code: int, data: dict | None = None, text: str = "") -> None:
        self.status_code = status_code
        self._data = data or {}
        self.text = text

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            # httpx2.HTTPStatusError(message, request=..., response=...)
            request = httpx2.Request("POST", "https://example.test/v1/chat/completions")
            response = httpx2.Response(self.status_code, text=self.text, request=request)
            raise httpx2.HTTPStatusError(
                f"HTTP {self.status_code}",
                request=request,
                response=response,
            )

    def json(self) -> dict:
        return self._data


class _ScriptedClient:
    """POST 호출마다 미리 정한 응답을 순서대로 반환."""

    queue: list[_Resp] = []
    calls: list[dict] = []

    def __init__(self, timeout: int | None = None) -> None:
        pass

    async def __aenter__(self) -> _ScriptedClient:
        return self

    async def __aexit__(self, *args: object) -> bool:
        return False

    async def post(self, url: str, json: dict | None = None, headers: dict | None = None) -> _Resp:
        _ScriptedClient.calls.append(
            {
                "url": url,
                "model": (json or {}).get("model"),
                "auth": (headers or {}).get("Authorization"),
            }
        )
        if not _ScriptedClient.queue:
            raise RuntimeError("no scripted responses left")
        return _ScriptedClient.queue.pop(0)


@pytest.fixture
def scripted_http(monkeypatch: pytest.MonkeyPatch) -> type[_ScriptedClient]:
    _ScriptedClient.queue = []
    _ScriptedClient.calls = []
    monkeypatch.setattr(ai_client.httpx2, "AsyncClient", _ScriptedClient)
    return _ScriptedClient


def _ok(content: str = '{"kind":"answer","message":"ok"}') -> _Resp:
    return _Resp(
        200,
        {
            "choices": [{"message": {"content": content}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 2},
        },
    )


def test_cascade_models_default() -> None:
    assert ai_client.DEFAULT_CASCADE_MODELS[0] == "gemini-2.5-flash"
    assert "gemini-2.5-flash-lite" in ai_client.DEFAULT_CASCADE_MODELS
    assert "gemini-3-flash-preview" in ai_client.DEFAULT_CASCADE_MODELS
    assert "gemini-3.1-flash-lite" in ai_client.DEFAULT_CASCADE_MODELS


def test_cascade_keys_order(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_api_key_1", "k1")
    monkeypatch.setattr(settings, "ai_api_key_2", "")
    monkeypatch.setattr(settings, "ai_api_key_3", "k3")
    keys = ai_client.cascade_keys()
    assert [k.name for k in keys] == ["key1", "key3"]
    assert keys[0].token == "k1"


def test_failover_next_model_same_key(
    monkeypatch: pytest.MonkeyPatch, scripted_http: type[_ScriptedClient]
) -> None:
    monkeypatch.setattr(settings, "ai_api_key_1", "tok-a")
    monkeypatch.setattr(settings, "ai_api_key_2", "")
    monkeypatch.setattr(settings, "ai_api_key_3", "")
    monkeypatch.setattr(
        settings,
        "ai_cascade_models",
        "gemini-2.5-flash,gemini-2.5-flash-lite",
    )
    scripted_http.queue = [
        _Resp(429, text="rate limit"),
        _ok(),
    ]

    reply = asyncio.run(ai_client.call_ai([{"role": "user", "content": "hi"}]))

    assert reply.content.startswith("{")
    assert reply.used_model == "gemini-2.5-flash-lite"
    assert reply.used_key == "key1"
    assert [c["model"] for c in scripted_http.calls] == [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
    ]


def test_failover_next_key_after_quota(
    monkeypatch: pytest.MonkeyPatch, scripted_http: type[_ScriptedClient]
) -> None:
    monkeypatch.setattr(settings, "ai_api_key_1", "tok-a")
    monkeypatch.setattr(settings, "ai_api_key_2", "tok-b")
    monkeypatch.setattr(settings, "ai_api_key_3", "")
    monkeypatch.setattr(settings, "ai_cascade_models", "m1,m2")
    # key1 첫 모델에서 쿼터 → 키 소진으로 m2 스킵, key2 m1 성공
    scripted_http.queue = [
        _Resp(429, text="You exceeded your current quota"),
        _ok(),
    ]

    reply = asyncio.run(ai_client.call_ai([{"role": "user", "content": "hi"}]))

    assert reply.used_key == "key2"
    assert reply.used_model == "m1"
    assert [c["auth"] for c in scripted_http.calls] == [
        "Bearer tok-a",
        "Bearer tok-b",
    ]
    assert [c["model"] for c in scripted_http.calls] == ["m1", "m1"]


def test_list_models_cascade(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_api_key_1", "k")
    monkeypatch.setattr(settings, "ai_api_key_2", "")
    monkeypatch.setattr(settings, "ai_api_key_3", "")
    monkeypatch.setattr(settings, "ai_cascade_models", "a,b,c")
    models = asyncio.run(ai_client.list_models())
    assert models == ["a", "b", "c"]
