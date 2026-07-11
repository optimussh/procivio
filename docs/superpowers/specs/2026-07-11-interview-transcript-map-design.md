# 인터뷰·트랜스크립트 → 프로세스맵 (P0) — 설계

> **날짜:** 2026-07-11  
> **상태:** 구현됨 (P0 API + Transcript UI — 브라우저 실모델 스모크는 수동)  
> **트랙:** 상업용 P0 — 인터뷰·회의록 기반 디스커버리 (BPMN export는 다음 트랙)  
> **관련 문서:** `2026-07-11-inquire-mvp-design.md`, `2026-07-11-ai-graph-merge-design.md`, `2026-07-11-roadmap-master-design.md`  
> **결정:** 접근 **B** — 트랜스크립트 붙여넣기 + Inquire 병행 + 기존 graph JSON 파이프라인 + 병합 프리뷰

---

## 1. 문제

컨설팅식 프로세스 디스커버리는 자유 채팅이나 5문항 스크립트만으로는 체감이 약하다. 사용자는 인터뷰 녹취·회의록을 붙여 넣고, **수분 안에 검토 가능한 맵 초안**을 본 뒤, **게시 전 사람이 승인**하기를 원한다.

풀 BPMN 2.0 에디터·Signavio 클론은 P0 범위 밖이다(로드맵 마스터 설계와 동일). 캔버스를 bpmn-js로 바꾸지 않고, **Procivio 그래프 모델 + AI 병합 경로를 재사용**한다.

---

## 2. 목표 / 비목표

### 목표 (P0)

| ID | 내용 |
|----|------|
| G1 | 트랜스크립트 붙여넣기 → `kind=graph` 제안 생성 |
| G2 | AI graph 병합과 **동일한 적용 경로** (프리뷰 + Import 탭) |
| G3 | Inquire Q&A 모드 **병행 유지** 및 품질 소폭 보강 |
| G4 | 생성·적용은 **체크아웃 + 편집 권한** 필수 |
| G5 | 원문 트랜스크립트 **장기 저장 기본 금지** |
| G6 | 사용량 이벤트에 **원문 본문 미저장** |
| G7 | 검증 실패 시 **1회 self-repair** 재생성 |

### 비목표 (P0)

| 제외 | 이유 |
|------|------|
| BPMN XML export/import | P1 트랙 |
| 다수 현업 설문 링크 수집 | P3 |
| 프로세스 마이닝·이벤트 로그 | 로드맵 후순위 |
| 풀 BPMN 도형 (Pool, Message, Timer 등) | 이후 |
| 제품 내 음성 STT | 외부 STT → 텍스트 붙여넣기 |
| Human apply 없는 자동 게시 | 상업용 HITL 필수 |

---

## 3. 사용자 경험

### 3.1 AI 패널 모드

에디터 AI 패널에서 모드를 구분한다 (UI 상태 상호 배타).

| 모드 | 설명 |
|------|------|
| **Chat** | 기존 자유 편집·질문 |
| **Inquire** | 기존 고정 Q1–Q5 + 초안 생성 |
| **Transcript** | **신규** — 회의록·인터뷰 전문 붙여넣기 → 맵 생성 |

### 3.2 Transcript 흐름

```text
에디터 (draft + 체크아웃)
  → AI 패널 → Transcript
  → (선택) 산업 힌트: 없음 | 항체 | 반도체 | 배터리 | 자유 텍스트
  → 트랜스크립트 붙여넣기 (textarea)
  → (선택) 초점 한 줄 예: "사진 공정 coat~CD만 맵으로"
  → [맵 초안 생성]
  → LLM → kind=graph
  → enterAiGraphPreview (병합) → Import 탭 검토
  → 적용 / 취소
```

- **빈 캔버스:** base 없는 전체 생성 병합  
- **기존 노드 있음:** 제목 매칭 병합, subprocess 링크 보존 (기존 규칙)

### 3.3 Inquire (표면 유지, 품질만 소폭)

- 5문항·토큰 `__inquire_start__` / `__inquire_generate__` 유지  
- 프롬프트만 L1–L5 용어·start/end/decision 규칙 강화  
- 답변 저장 모델 신규 없음 (현행 세션 페이로드)

### 3.4 카피·i18n

- UI 기본 영어, 한국어는 `i18n-messages.ts`  
- graph 카드 안내: “Import 탭에서 검토·적용” (AI 병합 카피 재사용)  
- Transcript 모드 고지: “이 요청에 한해 설정된 AI 제공자로 전송되며, 맵 본문으로 저장되지 않습니다.”

---

## 4. 아키텍처

### 4.1 파이프라인 (Text→JSON→결정론적 렌더)

```text
[트랜스크립트 + 선택 focus + 산업 힌트]
        │
        ▼
  build_transcript_messages()   # 시스템·유저 메시지
        │
        ▼
  LLM (기존 키 캐스케이드)
        │
        ▼
  AiProposal kind=graph          # 현행 스키마
        │
        ▼
  (선택) 검증 실패 시 오류 문구로 1회 self-repair
        │
        ▼
  프론트: buildGraphFromAiProposal → Import 프리뷰 → 적용
```

LLM에게 **좌표·BPMN XML을 직접 만들지 않는다.** 배치는 dagre 등 기존 결정론적 레이아웃.

### 4.2 백엔드

| 항목 | 결정 |
|------|------|
| 엔드포인트 | **권장:** `POST /api/versions/{version_id}/ai/from-transcript` (한도·감사 명확). 내부는 chat과 LLM·파서 헬퍼 공유. 대안: `ai/chat`에 `transcript_mode` 확장. |
| 인증·게이트 | AI chat과 동일: draft 버전, 체크아웃 보유자, 맵 역할 editor+ |
| 요청 본문 | `transcript`, `focus`(기본 ""), `industry_hint`(기본 ""), `session_id?` |
| 최대 길이 | **48,000자** 초과 시 400 (env `AI_TRANSCRIPT_MAX_CHARS`, 기본 48000). **조용한 절단 금지.** |
| 최소 길이 | **80자** |
| 응답 | 현행 `AiProposal` (`kind=graph` 기대; ops만 오면 422 또는 1회 재시도) |
| 영속화 | 트랜스크립트 전문을 `AiChatMessage`에 **넣지 않음**. 저장 허용: 모드 플래그, 글자 수, industry_hint, focus(최대 500자), 제안 요약 message |
| 사용량 | 기존 `ai_usage_events` — 토큰·성공 여부. **transcript 컬럼 없음** |
| Self-repair | 파싱/검증 실패 후 오류 발췌(최대 2k자)로 **1회** 추가 호출 |

### 4.3 프롬프트 규칙 (트랜스크립트)

`ai_prompt.py`에 `build_transcript_generate_messages(...)` 추가.

1. 텍스트에 나온 행위자·단계·분기만 추출. **명시되지 않은 시스템·담당자 지어내기 금지.**  
2. `kind=graph`, 타입은 `start` / `process` / `decision` / `end`만.  
   - **P0: 자동 subprocess 링크 생성 없음** (맵 id 해석 없음).  
3. L3형 end-to-end면 process 노드 5–15개 권장. 다도메인이면 `focus` 또는 주 흐름만 맵핑하고 `message`에 명시.  
4. decision은 실질적으로 분기 2갈래 이상, 라벨 Yes/No 또는 짧은 조건.  
5. 좌표 금지. assignee/department는 원문에 명시된 경우만.

`industry_hint` 선택 시 짧은 도메인 어휘 불릿만 주입 (시드 트리 전체 덤프 금지).  
예: “메모리 FAB 사진: coat, expose, develop, CD”.

### 4.4 프론트엔드

| 항목 | 결정 |
|------|------|
| 패널 | 모드: Chat · Inquire · Transcript |
| Transcript UI | textarea, 글자 수, 산업 선택, focus 입력, 생성 버튼 |
| 생성 버튼 | 체크아웃·편집 불가 시 비활성, 길이 범위 밖 비활성 |
| 성공 시 | graph 제안 → **병합 프리뷰만** (전량 교체 금지) |
| 로딩 | 기존 AI busy 상태 |
| 오류 | 토스트 + 인라인 (한도, 502, 검증) |

### 4.5 보안·상업

| 규칙 | 상세 |
|------|------|
| HITL | 적용은 사용자 명시 동작. published 자동 반영 없음 |
| 제공자 | 설정된 키 캐스케이드만. P0에서 신규 벤더 강제 없음 |
| 데이터 | 맵 테이블에 원문 없음. 채팅 메시지에 전문 미저장 |
| 감사 | 적용 시 기존 버전 이벤트·사용량 유지. 향후 `source=ai_transcript` note 가능 |
| 라이선스 | P0 코어에 AGPL bpmn-js 등 도입 없음 |

---

## 5. 데이터 계약

### 5.1 요청 (from-transcript)

```json
{
  "transcript": "string",
  "focus": "선택, 최대 500자",
  "industry_hint": "none|antibody|semiconductor|battery|기타 텍스트",
  "session_id": null
}
```

### 5.2 응답

기존 `AiProposal` — 주로:

```json
{
  "kind": "graph",
  "message": "…",
  "nodes": [ … ],
  "edges": [ … ],
  "groups": []
}
```

### 5.3 환경 변수

| 변수 | 기본 | 의미 |
|------|------|------|
| `AI_TRANSCRIPT_MAX_CHARS` | `48000` | 초과 시 거절 |
| (기존) AI 캐스케이드 키 | — | 변경 없음 |

---

## 6. 테스트

| 계층 | 케이스 |
|------|--------|
| 백엔드 단위 | 최소/최대 길이 400, 체크아웃 게이트, 프롬프트 규칙, 채팅 메시지에 전문 없음 |
| 백엔드 + mock LLM | 유효 graph 형태, 검증 실패 시 self-repair 1회 |
| 프론트 vitest | 모드 전환, 생성 비활성 조건, 글자 수 |
| 브라우저 스모크 | 샘플 붙여넣기 → Import 탭 → 적용 (빈 캔버스·기존 노드) |
| 회귀 | Inquire·chat 기존 테스트 통과, AI graph 병합 시 subprocess 보존 |

---

## 7. 구현 슬라이스 (이후 계획용)

| 슬라이스 | 산출물 |
|----------|--------|
| T1 | 백엔드 라우트 + 한도 + 프롬프트 빌더 + 테스트 |
| T2 | Self-repair + 사용량 이벤트 |
| T3 | AI 패널 Transcript 모드 UI + i18n |
| T4 | 생성 → 병합 프리뷰 연결 |
| T5 | Inquire 프롬프트 소폭 개선 |
| T6 | 브라우저 스모크 + `PROGRESS.md`·실모델 스모크 시나리오 문서 |

예상: **집중 구현 몇 세션** (BPMN 수주 규모 아님).

---

## 8. 성공 기준 (데모·상업)

1. 2–5페이지 분량 인터뷰 노트 → Generate 1회로 start + process 3개 이상 + end 초안.  
2. base에 기존 subprocess가 있으면 Apply 후에도 링크 보존.  
3. “원문은 맵에 안 남고, 승인된 그래프만 남는다”고 설명 가능.  
4. P0 설치·라이선스 인벤토리에 BPMN 에디터 의존성 없음.

---

## 9. 후속 (명시적 연기)

| ID | 항목 |
|----|------|
| P1 | BPMN 2.0 XML export 서브셋 (Task, XOR, sequence, start/end + DI) — **구현됨** `bpmn_io` + GET export |
| P1b | BPMN 서브셋 import — **구현됨** POST import/bpmn + 에디터 메뉴 |
| P2 | 트랜스크립트 두 번 생성으로 As-Is / To-Be 나란히 비교 |
| P3 | 다수 이해관계자 가이드 인터뷰 수집 |
| P4 | 마이닝·이벤트 로그 |

---

## 10. 스펙 자체 점검

| 점검 | 결과 |
|------|------|
| 플레이스홀더 | 의도적 TBD 없음. env 기본값 명시 |
| 일관성 | graph + 병합 단일 적용 경로. 이중 apply 없음 |
| 범위 | P0만. BPMN·마이닝 절단 |
| 모호성 | 엔드포인트는 전용 라우트 권장. 원문은 채팅 메시지 미저장 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-11 | 초안 — 사용자 P0(접근 B) 선택 |
| 2026-07-11 | 본문 전면 한국어 작성 |
| 2026-07-11 | 사용자 승인 · 구현 계획 연결 |
