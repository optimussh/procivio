# Roadmap master design / 로드맵 마스터 설계

> **Date / 날짜:** 2026-07-11  
> **Status / 상태:** Staged implementation / 단계 구현  
> **Levels / 레벨:** L1 Domain → L2 Capability → L3 Process → L4 Sub-Process → L5 Task  

---

## 0. Product boundary / 제품 경계

| In scope (Knowledge Map) / 포함 | Out of scope (now) / 제외 |
|----------------------------------|---------------------------|
| Canvas, versions, RBAC, approval | Temporal / Argo / Airflow in-app |
| Structure tree L1–L5 | n8n / Fair-code embeds |
| Inquire → graph | Full process mining |
| SOP links, export (later phases) | Full BPMN editor |

**EN:** Sell **process knowledge** first; optional runtime later beside the product.  
**KO:** 먼저 **프로세스 지식 플랫폼**, 실행 엔진은 나중에 옆 어댑터.

---

## 1. Status matrix / 현황

| ID | Feature EN | 기능 KO | Spec | Code |
|----|------------|---------|------|------|
| LIC | License inventory | 라이선스 인벤토리 | ✅ | ✅ |
| P0-01 | Inquire interview → map | 인터뷰→맵 | ✅ | ✅ S1–S2 |
| P0-02 | Taxonomy + Structure tree | 레벨+구조 트리 | ✅ | ✅ Phase A |
| P0-02b | Parent picker + PATCH | 상위 맵 지정 | ✅ | ✅ |
| P0-02c | performer_type UI | 수행 주체 UI | ✅ | ✅ |
| P0-05 | AI key cascade | AI 키 캐스케이드 | ✅ | ✅ |
| P1-02 | PDF export | PDF 내보내기 | ⬜ | ⬜ |
| P1-03 | Templates | 템플릿 맵 | ⬜ | ⬜ |
| P2-* | Runtime / mining | 실행·마이닝 | ⬜ | later |

---

## 2. Phases / 단계

### Phase A — Structure complete / 구조 완성 (done)

| Goal EN | 목표 KO |
|---------|---------|
| Structure page + nav | 구조 페이지·네비 |
| Parent on create + PATCH | 생성 시 parent·PATCH |
| Performer on nodes | 노드 수행 주체 |
| Inquire L1–L5 wording | Inquire 레벨 문구 |
| UI language toggle | 한/영 UI 토글 |

### Phase B — Enterprise deliverables / 납품 산출물 (next)

| ID | EN | KO |
|----|----|----|
| B1 | PDF export (cover + map + meta) | PDF 내보내기 |
| B2 | Template maps | 템플릿 맵 |
| B3 | Home filter by level | 홈 레벨 필터 |
| B4 | Legal NOTICE page | 고지 페이지 |

### Phase C — Runtime adapter / 실행 어댑터 (later)

| EN | KO |
|----|-----|
| Approved graph → Temporal/Argo adapter | 승인 맵 → 실행 어댑터 |
| Engines optional, not core SaaS default | 엔진은 선택, 코어 기본 아님 |

---

## 3. Acceptance Phase A / 완료 기준

- [x] L1 Domain map + L3 child with parent  
- [x] Structure tree shows nesting  
- [x] Bad parent / cycle rejected  
- [x] performer_type saves with graph  
- [x] Lang toggle KO | EN in TopNav  

---

## Changelog / 변경 이력

| Date | Note |
|------|------|
| 2026-07-11 | Master design + Phase A implement |
| 2026-07-11 | Docs bilingual EN+KO |
