# 인터뷰·트랜스크립트 → 프로세스맵 (P0) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-step. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회의록·인터뷰 전문을 붙여 넣어 LLM으로 `kind=graph` 초안을 만들고, 기존 AI graph 병합 프리뷰로 검토·적용한다. 원문은 DB에 장기 저장하지 않는다.

**Architecture:** 전용 `POST /api/versions/{id}/ai/from-transcript`가 길이 검증 → 트랜스크립트 전용 프롬프트 → 기존 LLM 캐스케이드 → (선택) 1회 self-repair → `AiProposal`을 반환한다. 프론트 AI 패널에 Transcript 모드를 추가하고, 성공 시 기존 `onGraphProposal` / Import 탭 경로만 사용한다. Inquire·Chat은 유지한다.

**Tech Stack:** FastAPI, SQLAlchemy async, 기존 `ai_client` 캐스케이드, Next.js/React, pytest, vitest, Playwright smoke

**Spec:** `docs/superpowers/specs/2026-07-11-interview-transcript-map-design.md`

---

## Global Constraints

- 브랜치: 권장 워크트리 또는 현재 브랜치. **머지는 사용자 확인 후.**
- 원문 트랜스크립트를 `AiChatMessage`·맵 테이블·`ai_usage_events`에 **저장하지 않는다** (글자 수·힌트·요약만).
- graph 적용은 **전량 교체 금지** — `buildGraphFromAiProposal` + Import 프리뷰만.
- P0에서 subprocess 자동 링크·BPMN XML 없음.
- 시간: `app.clock.now`. UI 영어 기본 + i18n EN/KO. raw hex 금지.
- 커밋 직전 `PROGRESS.md` 한 줄. 메시지 형식 `type(scope): English — 한국어`.
- 게이트 (PowerShell):
  - backend: `.venv\Scripts\python -m pytest tests/ -q` · `.venv\Scripts\ruff check app/ tests/`
  - frontend: `npx vitest run` · `npx tsc --noEmit` · `npm run lint`

---

## File map

| 파일 | 역할 |
|------|------|
| `backend/app/settings.py` | `ai_transcript_max_chars` |
| `backend/app/schemas.py` | `AiTranscriptRequest` |
| `backend/app/ai_prompt.py` | `build_transcript_generate_messages` |
| `backend/app/routers/ai.py` | `from-transcript` 라우트 + self-repair |
| `backend/tests/test_ai_transcript.py` | 신규 테스트 |
| `frontend/src/lib/api.ts` | `aiFromTranscript` |
| `frontend/src/components/ai-chat-panel.tsx` | Transcript 모드 UI |
| `frontend/src/lib/i18n-messages.ts` | EN/KO 키 |
| `docs/ai-real-model-smoke.md` | 시나리오 1줄 |
| `PROGRESS.md` | 진행 기록 |
| `.env.example` | env 키 주석 |

---

### Task 1: 설정·스키마·프롬프트 빌더 (TDD)

**Files:**
- Modify: `backend/app/settings.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/ai_prompt.py`
- Create: `backend/tests/test_ai_transcript.py`

- [ ] **Step 1: 실패하는 테스트 — 프롬프트 빌더**

`backend/tests/test_ai_transcript.py` 생성:

```python
"""트랜스크립트 → 맵 초안 (design 2026-07-11 interview-transcript-map)."""

from __future__ import annotations

from app.ai_prompt import build_transcript_generate_messages
from app.schemas import GraphOut


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
    assert "kind=graph" in msgs[0]["content"] or "kind=graph" in msgs[1]["content"]
    user = msgs[-1]["content"]
    assert "요청 접수" in user
    assert "구매 발주만" in user
    assert "지어내지" in msgs[0]["content"] or "invent" in msgs[0]["content"].lower() or "명시" in msgs[0]["content"]
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```powershell
cd backend
.venv\Scripts\python -m pytest tests/test_ai_transcript.py::test_build_transcript_messages_includes_text_and_rules -v
```

Expected: `ImportError` 또는 `build_transcript_generate_messages` 없음.

- [ ] **Step 3: settings + 스키마**

`settings.py`에 필드 추가:

```python
# 트랜스크립트 → 맵 초안 입력 상한(자). 초과 시 400, 절단 금지.
ai_transcript_max_chars: int = 48000
```

`schemas.py`에 (AiChatRequest 근처):

```python
class AiTranscriptRequest(BaseModel):
    transcript: str = Field(min_length=1)
    focus: str = Field(default="", max_length=500)
    industry_hint: str = Field(default="", max_length=100)
    session_id: int | None = None
    model: str | None = None
```

(실제 min_length 검증은 라우터에서 80자·max도 라우터에서 — 스키마는 1자 이상만 두고 라우터가 상세 메시지.)

- [ ] **Step 4: 프롬프트 빌더 구현**

`ai_prompt.py`에 추가 (기존 `_INSTRUCTIONS` / `build_system_prompt` 재사용):

```python
_INDUSTRY_HINTS: dict[str, str] = {
    "antibody": "도메인 힌트: 항체 의약품(mAb) — 영업·세포배양·정제·구매·생산계획·자재.",
    "semiconductor": "도메인 힌트: 메모리 반도체 FAB — 사진(coat/expose/develop/CD), 식각, 확산, 박막, Probe, 테스트.",
    "battery": "도메인 힌트: 이차전지 — 전극 코팅, 셀 조립, 포메이션, 모듈·팩.",
}


def build_transcript_generate_messages(
    *,
    manual: str,
    current_graph: GraphOut,
    can_edit: bool,
    transcript: str,
    focus: str = "",
    industry_hint: str = "",
) -> list[dict[str, str]]:
    """회의록·인터뷰 전문 → kind=graph 전용 메시지."""
    system = build_system_prompt(manual=manual, can_edit=can_edit)
    # can_edit False면 graph 생성 금지 문구는 build_system_prompt 기존 규칙 따름
    hint_key = (industry_hint or "").strip().lower()
    hint_line = _INDUSTRY_HINTS.get(hint_key, "")
    if industry_hint and not hint_line and hint_key not in ("", "none"):
        hint_line = f"도메인 힌트(사용자): {industry_hint.strip()[:200]}"
    focus_line = f"초점: {focus.strip()}\n" if focus.strip() else ""
    user = (
        "다음 인터뷰·회의 텍스트만 근거로 프로세스맵 JSON(kind=graph)을 만드세요.\n"
        "텍스트에 없는 담당자·시스템·단계를 지어내지 마세요.\n"
        "node_type은 start|process|decision|end 만. subprocess 노드는 만들지 마세요.\n"
        "process 노드는 가능하면 5~15개. decision은 분기 라벨을 달으세요.\n"
        f"{hint_line}\n{focus_line}"
        f"--- 트랜스크립트 ---\n{transcript}\n--- 끝 ---"
    )
    # build_messages와 동일하게 현재 그래프 블록 포함
    return build_messages(
        manual=manual,
        current_graph=current_graph,
        can_edit=can_edit,
        history=[],
        instruction=user,
    )
```

구현 시 `build_messages` 시그니처에 맞게 조정. 핵심: system에 graph 규칙, user에 원문.

- [ ] **Step 5: 테스트 PASS**

```powershell
.venv\Scripts\python -m pytest tests/test_ai_transcript.py -v
```

- [ ] **Step 6: Commit**

```powershell
git add backend/app/settings.py backend/app/schemas.py backend/app/ai_prompt.py backend/tests/test_ai_transcript.py
git commit -m "feat(ai): transcript prompt builder and request schema — 트랜스크립트 프롬프트·스키마"
```

---

### Task 2: from-transcript 라우트 + 한도 + 게이트 (TDD)

**Files:**
- Modify: `backend/app/routers/ai.py`
- Modify: `backend/tests/test_ai_transcript.py`
- Modify: `.env.example` (한 줄 주석)

- [ ] **Step 1: 실패 테스트 — 너무 짧음 / 너무 김 / 성공 경로**

`test_ai_transcript.py`에 추가 (Inquire 테스트의 draft 체크아웃 헬퍼 패턴 재사용 — `test_ai_inquire.py`의 `_draft_checked_out` 복사 또는 conftest 공용):

```python
import pytest
from fastapi.testclient import TestClient
from app import ai_client
from app.settings import settings


def _enable_ai(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_enabled", True)


def test_transcript_too_short_400(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _enable_ai(monkeypatch)
    vid = _draft_checked_out(client)  # test_ai_inquire와 동일 헬퍼 복사
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

    async def _fake(messages, model=None):
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
```

`_draft_checked_out` / `_fake` 시그니처는 현재 `ai_client.AiReply` 형태에 맞출 것 (`test_ai.py` 참고).

- [ ] **Step 2: FAIL 확인**

```powershell
.venv\Scripts\python -m pytest tests/test_ai_transcript.py -v
```

- [ ] **Step 3: 라우트 구현**

`ai.py`에 엔드포인트 추가. 구조 스케치:

```python
@router.post("/versions/{version_id}/ai/from-transcript", response_model=AiProposal)
async def ai_from_transcript(
    version_id: int,
    payload: AiTranscriptRequest,
    session: AsyncSession = Depends(get_session),
    user: str = Depends(get_current_user),
) -> AiProposal:
    # 1) AI 비활성 → 503 기존 패턴
    # 2) require_version_map_role editor+
    # 3) version draft + checkout active → 아니면 403/409 기존 chat과 동일
    # 4) text = payload.transcript.strip()
    #    if len(text) < 80: 400
    #    if len(text) > settings.ai_transcript_max_chars: 400
    # 5) graph = await _load_graph(...)
    # 6) manual = select_manual_sections(...)
    # 7) messages = build_transcript_generate_messages(...)
    # 8) proposal, usage = await _ask_and_validate(messages, payload.model)
    # 9) if proposal.kind != "graph": 한 번 self-repair 또는 422
    # 10) usage 이벤트 기록 (transcript 본문 없음 — meta만 원하면 note에 char_count)
    # 11) 채팅 세션 저장 시 user message는 "[transcript N chars]" 요약만
    return proposal
```

체크아웃·역할 게이트는 기존 `ai/chat` 핸들러 복사. 차이: instruction 대신 transcript 필드.

Self-repair (최소):

```python
if proposal.kind != "graph" or not proposal.nodes:
    repair_msgs = messages + [
        {"role": "assistant", "content": raw_or_summary},
        {"role": "user", "content": "반드시 kind=graph JSON만. start/process/end 포함."},
    ]
    proposal, usage2 = await _ask_and_validate(repair_msgs, payload.model)
```

- [ ] **Step 4: PASS + ruff**

```powershell
.venv\Scripts\python -m pytest tests/test_ai_transcript.py tests/test_ai_inquire.py -q
.venv\Scripts\ruff check app/ tests/test_ai_transcript.py
```

- [ ] **Step 5: `.env.example` 한 줄**

```
# AI_TRANSCRIPT_MAX_CHARS=48000
```

- [ ] **Step 6: Commit**

```powershell
git add backend/app/routers/ai.py backend/tests/test_ai_transcript.py .env.example
git commit -m "feat(ai): from-transcript API with length gates — 트랜스크립트 맵 API"
```

---

### Task 3: 프론트 API 클라이언트

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: 함수 추가**

`aiChat` 근처에:

```typescript
export interface AiTranscriptRequest {
  transcript: string;
  focus?: string;
  industry_hint?: string;
  session_id?: number | null;
  model?: string | null;
}

export function aiFromTranscript(
  versionId: number,
  body: AiTranscriptRequest,
): Promise<AiProposal> {
  return request<AiProposal>(`/versions/${versionId}/ai/from-transcript`, {
    method: "POST",
    body: JSON.stringify({
      transcript: body.transcript,
      focus: body.focus ?? "",
      industry_hint: body.industry_hint ?? "",
      session_id: body.session_id ?? null,
      model: body.model ?? null,
    }),
  });
}
```

- [ ] **Step 2: tsc**

```powershell
cd frontend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git add frontend/src/lib/api.ts
git commit -m "feat(ai): aiFromTranscript client — 트랜스크립트 API 클라이언트"
```

---

### Task 4: AI 패널 Transcript 모드 UI + i18n

**Files:**
- Modify: `frontend/src/components/ai-chat-panel.tsx`
- Modify: `frontend/src/lib/i18n-messages.ts`

- [ ] **Step 1: i18n 키 (EN + KO)**

예:

```
"ai.mode.chat": "Chat"
"ai.mode.inquire": "Inquire"
"ai.mode.transcript": "Transcript"
"ai.transcript.placeholder": "Paste interview or meeting notes…"
"ai.transcript.focus": "Focus (optional)"
"ai.transcript.industry": "Industry hint"
"ai.transcript.generate": "Generate map draft"
"ai.transcript.disclaimer": "Text is sent for this request only; not stored as map content."
"ai.transcript.tooShort": "Need at least 80 characters."
"ai.transcript.tooLong": "Text exceeds the maximum length."
"ai.transcript.chars": "{n} characters"
```

KO 대응 문구 동일 파일 하단 블록에 추가.

- [ ] **Step 2: 패널 상태**

`ai-chat-panel.tsx`:

```typescript
type AiPanelMode = "chat" | "inquire" | "transcript";
const [panelMode, setPanelMode] = useState<AiPanelMode>("chat");
// inquireMode boolean은 panelMode === "inquire"와 동기화하거나 inquire를 panelMode로 대체
```

세그먼트 UI (data-id):

- `data-id="ai-mode-chat"`
- `data-id="ai-mode-inquire"`
- `data-id="ai-mode-transcript"`

Transcript 전용 블록:

- textarea `data-id="ai-transcript-input"`
- focus input `data-id="ai-transcript-focus"`
- industry select `data-id="ai-transcript-industry"` (none | antibody | semiconductor | battery)
- Generate `data-id="ai-transcript-generate"`
- char count, disclaimer

- [ ] **Step 3: Generate 핸들러**

```typescript
async function onTranscriptGenerate() {
  const text = transcript.trim();
  if (text.length < 80) { /* toast/error */ return; }
  if (!versionId || busy || !canEdit) return;
  setBusy(true);
  try {
    const proposal = await aiFromTranscript(versionId, {
      transcript: text,
      focus: focus.trim(),
      industry_hint: industry,
      session_id: sessionId,
      model: selectedModel,
    });
    if (proposal.kind === "graph") {
      onGraphProposal(proposal);
    }
    // append assistant summary bubble if panel shows messages
  } catch (e) {
    // existing error surface
  } finally {
    setBusy(false);
  }
}
```

`canEdit` / versionId props는 패널 기존 props 확인 후 맞춤.  
Generate 비활성: `!canEdit || busy || text.length < 80`.

- [ ] **Step 4: Inquire 토글과 모드 충돌 방지**

- Transcript 진입 시 inquireMode off  
- Inquire ON 시 panelMode = inquire  

- [ ] **Step 5: lint/tsc**

```powershell
npx tsc --noEmit
npm run lint
```

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/components/ai-chat-panel.tsx frontend/src/lib/i18n-messages.ts
git commit -m "feat(ai): Transcript mode in AI panel — 회의록 붙여넣기 UI"
```

---

### Task 5: page.tsx 연결 확인 + Inquire 프롬프트 소폭

**Files:**
- Modify: `frontend/src/app/maps/[mapId]/page.tsx` (필요 시 prop만)
- Modify: `backend/app/ai_prompt.py` (Inquire generate 문구)

- [ ] **Step 1: onGraphProposal 경로 확인**

`page.tsx`에서 `AiChatPanel`의 `onGraphProposal`이 이미 `enterAiGraphPreview` / merge로 가는지 확인.  
Transcript generate가 같은 콜백을 쓰면 **추가 작업 없음**.  
안 되어 있으면 graph kind만 프리뷰로 연결 (AI graph merge 설계와 동일).

- [ ] **Step 2: Inquire generate 프롬프트 1문단 보강**

`build_inquire_generate_messages` user 지시에:

```
"start 1개, end 1개 이상, process는 순서 있게. decision 분기 라벨. 담당자/부서는 답변에 있을 때만."
```

- [ ] **Step 3: pytest inquire 회귀**

```powershell
cd backend
.venv\Scripts\python -m pytest tests/test_ai_inquire.py tests/test_ai_transcript.py -q
```

- [ ] **Step 4: Commit**

```powershell
git commit -am "fix(ai): wire transcript to graph preview; polish inquire prompt — 연결·Inquire 보강"
```

---

### Task 6: 문서·스모크·최종 게이트

**Files:**
- Modify: `docs/ai-real-model-smoke.md` (시나리오 표 1행)
- Modify: `docs/superpowers/specs/2026-07-11-interview-transcript-map-design.md` (상태 → Approved for implementation)
- Modify: `PROGRESS.md`
- Optional: `frontend/scripts/pw-verify-ai-transcript.mjs` (로컬 서버 있을 때)

- [ ] **Step 1: 스모크 문서 행**

| ID | 내용 | 기대 |
|----|------|------|
| T-transcript | Transcript 모드에 80자+ 회의록 붙여넣기 → Generate | Import 탭 graph 프리뷰, Apply 후 노드 증가 |

- [ ] **Step 2: (선택) Playwright 최소 검증**

서버 기동 후: 로그인 → 맵 draft → AI Transcript → paste fixture → generate → `data-id` Import 탭 또는 프리뷰 노출.

- [ ] **Step 3: 전체 게이트**

```powershell
cd backend
.venv\Scripts\python -m pytest tests/ -q
.venv\Scripts\ruff check app/ tests/
cd ..\frontend
npx vitest run
npx tsc --noEmit
npm run lint
```

- [ ] **Step 4: PROGRESS + 스펙 상태**

- 스펙 상단: `상태: 구현 완료` 또는 `구현 중` 갱신  
- PROGRESS 섹션 추가

- [ ] **Step 5: Commit**

```powershell
git add docs PROGRESS.md
git commit -m "docs(ai): transcript map P0 smoke and progress — 문서·게이트"
```

---

## Spec coverage checklist

| 스펙 요구 | Task |
|-----------|------|
| G1 트랜스크립트 → graph | T1–T2, T4 |
| G2 병합 프리뷰 | T5 |
| G3 Inquire 유지·보강 | T5 |
| G4 체크아웃·편집 | T2 |
| G5–G6 원문 미저장 | T2 |
| G7 self-repair | T2 |
| UI Transcript 모드 | T4 |
| 길이 한도 | T1–T2 |
| 산업 힌트 | T1, T4 |
| 비목표 BPMN 등 | 계획에 미포함 |

## Placeholder scan

- 없음. 엔드포인트 경로·env·data-id·테스트 이름 명시.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-11-interview-transcript-map.md`.

**실행 방식 선택:**

1. **Subagent-Driven (권장)** — 태스크마다 새 서브에이전트, 태스크 사이 리뷰  
2. **Inline Execution** — 이 세션에서 순서대로 구현·체크포인트  

어떤 방식으로 진행할까요?
