"""AI(OpenAI 호환) 호출 어댑터 — 키·모델 캐스케이드 폴백 포함 (design 2026-06-15)."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

import httpx2

from app.settings import settings

logger = logging.getLogger(__name__)

MODEL_SEP = "::"  # 다중 엔드포인트 모델 id 구분자 — "<엔드포인트명>::<모델id>"

# 기본 모델 폴백 순서 (무료 한도·가용성 기준 순차 시도)
DEFAULT_CASCADE_MODELS: tuple[str, ...] = (
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview",  # Gemini 3 Flash (API id)
    "gemini-3.1-flash-lite",
)


@dataclass(frozen=True)
class AiReply:
    """chat/completions 1회 응답 — 본문 + usage(비표준 서버는 None)."""

    content: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    used_model: str | None = None  # 실제 성공한 모델 id (캐스케이드 시)
    used_key: str | None = None  # key1|key2|key3|…


@dataclass(frozen=True)
class AiEndpoint:
    """OpenAI 호환 엔드포인트 1개 — models가 있으면 그 목록만 노출(/models 조회 생략)."""

    name: str
    base_url: str
    token: str = ""
    model: str = ""  # 기본 모델 — 선택자가 모델을 안 주면 사용
    models: tuple[str, ...] = field(default_factory=tuple)  # 노출 목록(비면 /models 자동 조회)


@dataclass(frozen=True)
class _KeySlot:
    """캐스케이드용 API 키 슬롯."""

    name: str  # key1 / key2 / key3
    token: str


def cascade_models() -> tuple[str, ...]:
    """AI_CASCADE_MODELS 또는 기본 4종."""
    raw = settings.ai_cascade_models.strip()
    if not raw:
        return DEFAULT_CASCADE_MODELS
    models = tuple(m.strip() for m in raw.split(",") if m.strip())
    return models or DEFAULT_CASCADE_MODELS


def cascade_keys() -> list[_KeySlot]:
    """비어 있지 않은 AI_API_KEY_1~3 순서. 모두 비면 레거시 AI_API_TOKEN 1개."""
    slots: list[_KeySlot] = []
    for idx, token in enumerate(
        (settings.ai_api_key_1, settings.ai_api_key_2, settings.ai_api_key_3), start=1
    ):
        t = token.strip()
        if t:
            slots.append(_KeySlot(name=f"key{idx}", token=t))
    if slots:
        return slots
    legacy = settings.ai_api_token.strip()
    if legacy:
        return [_KeySlot(name="default", token=legacy)]
    return []


def uses_key_cascade() -> bool:
    """AI_API_KEY_1~3 중 하나라도 있으면 키·모델 캐스케이드 모드."""
    return bool(
        settings.ai_api_key_1.strip()
        or settings.ai_api_key_2.strip()
        or settings.ai_api_key_3.strip()
    )


def get_ai_endpoints() -> list[AiEndpoint]:
    """AI_ENDPOINTS(JSON 배열) 파싱 — 비우면 기존 단일 설정(AI_BASE_URL 등)으로 폴백.

    잘못된 JSON/빈 배열은 ValueError — 설정 오류는 조용히 넘기지 않는다(라우터가 502 변환).
    키 캐스케이드 모드에서는 합성 엔드포인트 1개(목록=캐스케이드 모델)를 반환.
    """
    if uses_key_cascade():
        models = cascade_models()
        keys = cascade_keys()
        token = keys[0].token if keys else ""
        return [
            AiEndpoint(
                name="gemini",
                base_url=settings.ai_base_url,
                token=token,
                model=models[0] if models else "",
                models=models,
            )
        ]

    raw = settings.ai_endpoints.strip()
    if not raw:
        return [
            AiEndpoint(
                name="default",
                base_url=settings.ai_base_url,
                token=settings.ai_api_token,
                model=settings.ai_model,
            )
        ]
    try:
        items = json.loads(raw)
    except ValueError as exc:
        raise ValueError(f"AI_ENDPOINTS invalid JSON: {exc}") from exc
    if not isinstance(items, list) or not items:
        raise ValueError("AI_ENDPOINTS must be a non-empty JSON array")
    endpoints: list[AiEndpoint] = []
    for item in items:
        if not item.get("name") or not item.get("base_url"):
            raise ValueError("AI_ENDPOINTS entries require name and base_url")
        endpoints.append(
            AiEndpoint(
                name=str(item["name"]),
                base_url=str(item["base_url"]),
                token=str(item.get("token", "")),
                model=str(item.get("model", "")),
                models=tuple(str(m) for m in item.get("models", []) if str(m).strip()),
            )
        )
    return endpoints


def resolve_endpoint(model: str | None) -> tuple[AiEndpoint, str]:
    """모델 선택자("이름::모델" 또는 단일 모델명)를 (엔드포인트, 모델)로 해석.

    접두어가 없거나 이름이 안 맞으면 첫 엔드포인트 — 구형 프론트/저장값 하위호환.
    """
    endpoints = get_ai_endpoints()
    if model and MODEL_SEP in model:
        name, _, model_id = model.partition(MODEL_SEP)
        for endpoint in endpoints:
            if endpoint.name == name:
                return endpoint, model_id or endpoint.model
    first = endpoints[0]
    return first, (model or first.model)


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _is_key_exhausted(status_code: int, body: str) -> bool:
    """이 키로 더 시도해도 무의미한 경우 — 다음 키로 즉시 이동.

    일시적 rate limit(모델·RPM 제한)은 같은 키의 다음 모델로 넘어가고,
    쿼터·결제·일일 한도·키 무효만 키 소진으로 본다.
    """
    if status_code in (401, 403):
        return True
    lower = body.lower()
    # 할당량·일일 한도·결제·키 무효 — 같은 키의 다른 모델도 막힐 가능성 큼
    # 일반 "rate limit" 문구는 포함하지 않음(모델 폴백 대상)
    markers = (
        "quota",
        "resource_exhausted",
        "billing",
        "permission_denied",
        "api key not valid",
        "api_key_invalid",
    )
    if status_code == 429 and any(
        m in lower for m in ("quota", "billing", "daily", "exceeded your current")
    ):
        return True
    if status_code in (429, 403) and any(m in lower for m in markers):
        return True
    return False


def _is_retriable_status(status_code: int) -> bool:
    """같은 키에서 다음 모델로 넘어갈 수 있는 HTTP 상태."""
    return status_code in (404, 408, 429, 500, 502, 503, 504) or status_code >= 500


async def _post_chat(
    *,
    base_url: str,
    token: str,
    model_id: str,
    messages: list[dict],
) -> AiReply:
    url = f"{base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": model_id,
        "messages": messages,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    async with httpx2.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
        response = await client.post(url, json=payload, headers=_headers(token))
        response.raise_for_status()
        data = response.json()
    usage = data.get("usage") or {}
    return AiReply(
        content=data["choices"][0]["message"]["content"],
        prompt_tokens=usage.get("prompt_tokens"),
        completion_tokens=usage.get("completion_tokens"),
        used_model=model_id,
    )


def _preferred_model_id(model: str | None) -> str | None:
    """프론트 선택값에서 실제 모델 id만 추출 (name::model → model)."""
    if not model or not model.strip():
        return None
    if MODEL_SEP in model:
        _, _, model_id = model.partition(MODEL_SEP)
        return model_id.strip() or None
    return model.strip()


async def _call_ai_cascade(messages: list[dict], model: str | None = None) -> AiReply:
    """키1→모델순 → 키2→모델순 … 폴백.

    1번 키로 모델 목록을 순서대로 시도. 호출 실패(한도·모델 불가·5xx 등) 시 다음 모델.
    키가 소진(401/403/일일 쿼터)되면 남은 모델 건너뛰고 다음 키.
    """
    keys = cascade_keys()
    models = list(cascade_models())
    if not keys:
        raise RuntimeError("No AI API keys configured (set AI_API_KEY_1..3 or AI_API_TOKEN)")
    if not models:
        raise RuntimeError("No AI cascade models configured")

    preferred = _preferred_model_id(model)
    # 선택 모델이 목록에 있으면 그 지점부터(이전 모델은 이번 요청에서 스킵)
    start_model_idx = 0
    if preferred and preferred in models:
        start_model_idx = models.index(preferred)

    base_url = settings.ai_base_url.strip() or "https://generativelanguage.googleapis.com/v1beta/openai"
    errors: list[str] = []

    for key_i, key in enumerate(keys):
        model_order = models[start_model_idx:] if key_i == 0 else models
        for model_id in model_order:
            try:
                reply = await _post_chat(
                    base_url=base_url,
                    token=key.token,
                    model_id=model_id,
                    messages=messages,
                )
                logger.info("AI cascade success key=%s model=%s", key.name, model_id)
                return AiReply(
                    content=reply.content,
                    prompt_tokens=reply.prompt_tokens,
                    completion_tokens=reply.completion_tokens,
                    used_model=model_id,
                    used_key=key.name,
                )
            except httpx2.HTTPStatusError as exc:
                status = exc.response.status_code
                try:
                    body = (exc.response.text or "")[:400]
                except Exception:  # noqa: BLE001
                    body = ""
                # 토큰 값은 로그에 남기지 않음
                logger.warning(
                    "AI cascade fail key=%s model=%s status=%s body=%.200s",
                    key.name,
                    model_id,
                    status,
                    body,
                )
                errors.append(f"{key.name}/{model_id}:{status}")
                if _is_key_exhausted(status, body):
                    break  # 다음 키
                if _is_retriable_status(status) or status == 400:
                    continue  # 다음 모델
                raise
            except Exception as exc:  # noqa: BLE001 -- 네트워크 등 → 다음 모델
                logger.warning(
                    "AI cascade error key=%s model=%s: %s", key.name, model_id, exc
                )
                errors.append(f"{key.name}/{model_id}:{type(exc).__name__}")
                continue

    raise RuntimeError(
        "AI cascade exhausted all keys/models: " + "; ".join(errors[-12:])
    )


async def call_ai(messages: list[dict], model: str | None = None) -> AiReply:
    """OpenAI 호환 /chat/completions 호출 → 첫 choice의 message.content + usage.

    AI_API_KEY_1~3이 있으면 키·모델 캐스케이드.
    AI_ENDPOINTS가 비어 있고 레거시 AI_API_TOKEN만 있어도 모델 순차 폴백.
    AI_ENDPOINTS가 있으면 기존 단일 라우팅(캐스케이드 없음).
    네트워크/HTTP 오류는 예외로 전파(라우터가 502로 변환). 토큰은 로그에 남기지 않는다.
    """
    # 키 캐스케이드 우선 (사용자 지정 AI_API_KEY_1~3)
    if uses_key_cascade():
        return await _call_ai_cascade(messages, model)
    # 레거시 단일 토큰 + 엔드포인트 JSON 없음 → 모델 폴백만
    if not settings.ai_endpoints.strip() and settings.ai_api_token.strip():
        return await _call_ai_cascade(messages, model)

    endpoint, model_id = resolve_endpoint(model)
    reply = await _post_chat(
        base_url=endpoint.base_url,
        token=endpoint.token,
        model_id=model_id,
        messages=messages,
    )
    return AiReply(
        content=reply.content,
        prompt_tokens=reply.prompt_tokens,
        completion_tokens=reply.completion_tokens,
        used_model=model_id,
        used_key=endpoint.name,
    )


async def _discover_models(endpoint: AiEndpoint) -> list[str]:
    """엔드포인트의 /models 조회 — 실패 시 기본 모델로 폴백(개별 실패가 전체를 막지 않게)."""
    try:
        url = f"{endpoint.base_url.rstrip('/')}/models"
        async with httpx2.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
            response = await client.get(url, headers=_headers(endpoint.token))
            response.raise_for_status()
            data = response.json()
        return [model["id"] for model in data.get("data", [])]
    except Exception as exc:  # noqa: BLE001 -- 개별 엔드포인트 조회 실패는 기본 모델 폴백
        logger.warning("AI models list failed for endpoint %s: %s", endpoint.name, exc)
        return [endpoint.model] if endpoint.model else []


async def list_models() -> list[str]:
    """모델 목록 — 키 캐스케이드 모드면 고정 폴백 목록, 아니면 엔드포인트 합산.

    다중 엔드포인트면 "이름::모델" id(프론트는 " / "로 표시), 단일이면 모델명 그대로.
    """
    if uses_key_cascade():
        return list(cascade_models())

    endpoints = get_ai_endpoints()
    multi = len(endpoints) > 1
    result: list[str] = []
    for endpoint in endpoints:
        models = list(endpoint.models) or await _discover_models(endpoint)
        if multi:
            result += [f"{endpoint.name}{MODEL_SEP}{model}" for model in models]
        else:
            result += models
    return result
