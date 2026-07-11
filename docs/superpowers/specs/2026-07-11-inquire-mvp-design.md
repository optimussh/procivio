# Inquire MVP design / 인터뷰 모드 설계

> **Date / 날짜:** 2026-07-11  
> **Status / 상태:** Implemented S1–S2 (backend + AI panel UI)  
> **Levels / 레벨:** Align questions to L1–L5 taxonomy  

---

## 1. Problem / 문제

**EN:** Empty canvas + free chat feels weak for “consulting-style discovery.”  
**KO:** 빈 캔버스+자유 채팅만으로는 컨설팅식 디스커버리 체감이 약함.

**EN:** Fixed Q sequence → structure JSON → optional map apply = Aha moment.  
**KO:** 고정 질문 → 구조 JSON → (선택) 맵 반영이 Aha.

---

## 2. User flow / 사용자 흐름

```text
Editor (draft + checkout)
  → AI panel "Inquire" ON
  → System asks Q1…Q5
  → User answers (skip OK)
  → "Generate draft" / 초안 생성
  → kind=graph proposal → existing apply/preview
```

---

## 3. Interview script / 인터뷰 문항

| # | id | EN intent | KO 요지 | Level |
|---|-----|-----------|---------|-------|
| 1 | scope | Domain + process name & goal | 도메인·프로세스 이름·목적 | L1 + L3 |
| 2 | start_end | Start trigger / end condition | 시작 트리거·종료 조건 | L3/L4 |
| 3 | actors | Roles / depts (human or system) | 역할·부서 | L5 |
| 4 | steps | 3–7 ordered steps | 핵심 단계 3–7 | L4/L5 |
| 5 | branches | Branches / exceptions or “none” | 분기·예외 또는 없음 | L4 |

**EN:** Skip allowed; generate allowed with partial answers.  
**KO:** 스킵 가능, 답 일부만으로도 초안 생성 가능.

---

## 4. API / API

Extend existing `POST /api/versions/{id}/ai/chat`:

| Field | EN | KO |
|-------|----|----|
| `inquire_mode` | Interview mode on | 인터뷰 모드 |
| `inquire_step` | Current question index | 현재 문항 인덱스 |
| `inquire_answers` | Accumulated answers | 누적 답변 |
| instruction `__inquire_start__` | Start interview | 인터뷰 시작 |
| instruction `__inquire_generate__` | LLM graph generate | LLM 맵 초안 |

**EN:** Q progression is local (no LLM). Generate uses LLM + key cascade.  
**KO:** 질문 진행은 서버 로컬, 초안 생성만 LLM·키 캐스케이드.

---

## 5. UI / UI

| Element | EN | KO |
|---------|----|----|
| Inquire toggle | AI panel header | AI 패널 헤더 |
| Progress | Q n/5 | 진행 Q n/5 |
| Generate | When answers exist + canEdit | 답 있고 편집 가능할 때 |
| Apply | Existing graph/ops preview | 기존 제안 적용 UI |

---

## 6. Acceptance / 수용 기준

- [x] Start without LLM  
- [x] Five questions advance  
- [x] Generate → valid graph  
- [x] Normal chat unchanged when Inquire off  
- [ ] Browser smoke with real keys  

---

## 7. Out of scope / 범위 밖

Voice, full doc upload parse, Structure tree page (separate Phase A), Temporal.
