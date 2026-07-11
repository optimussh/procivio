# Workflow level taxonomy / 워크플로 레벨 택소노미

> **Status / 상태:** Product standard (2026-07-11)  
> **Related / 관련:** [`../spec.md`](../spec.md) · Inquire · Structure

---

## 1. Five levels / 5단계 (fixed)

| Level | English | 한국어 | Meaning / 의미 |
|:-----:|---------|--------|----------------|
| **1** | **Domain** | **도메인** | Core business area / 핵심 비즈 영역 |
| **2** | **Capability** | **핵심 기능** | Business capability bundle — **not** an IT menu / 업무 능력 묶음 — **IT 메뉴 아님** |
| **3** | **Process** | **프로세스** | End-to-end flow (default map) / end-to-end 업무 흐름 (맵 기본) |
| **4** | **Sub-Process** | **세부 프로세스** | Segment/variant inside a Process / 프로세스 안 구간·변형 |
| **5** | **Task** | **태스크** | Single unit of work (person and/or system) / 직원·시스템 단일 과업 |

### UI language toggle / 화면 언어 토글

- Chrome UI follows **한국어 | English** in TopNav (`i18n-messages.ts`).
- 화면 문구는 상단 **한/영 토글**을 따릅니다.
- Level labels: primary lang + other in parentheses  
  - KO UI: `L3 프로세스 (Process)`  
  - EN UI: `L3 Process (프로세스)`

### Example / 예 (Procurement / 구매)

```text
L1 Domain / 도메인              Procurement / 조달·구매
 └─ L2 Capability / 핵심 기능     Purchase request mgmt / 구매요청 관리
     └─ L3 Process / 프로세스       Request-to-PO / 요청~발주
         └─ L4 Sub-Process / 세부     Quote comparison / 견적 비교
             └─ L5 Task / 태스크        Enter PO in ERP / ERP PO 등록
```

---

## 2. Product rules / 제품 규칙

### 2.1 One map = one level / 맵당 레벨 하나

| EN | KO |
|----|-----|
| Each map has `workflow_level` 1–5 (default **3 Process**) | 맵마다 `workflow_level` 1–5 (기본 **3 프로세스**) |
| Canvas nodes usually mean the **next level down** | 캔버스 노드는 보통 **한 단계 아래** 의미 |
| Avoid dumping L5 tasks on an L1 map without structure | 구조 없이 L1 맵에 L5만 나열하지 말 것 |

### 2.2 Parent & skip / 상위 맵·스킵

| Mode | EN | KO |
|------|----|----|
| **Relaxed (default)** | Parent level must be **&lt;** child (skip OK, e.g. L1→L3) | 상위 레벨 &lt; 하위 (스킵 허용) |
| **Strict (future)** | Parent must be exactly child−1 | 바로 위 레벨만 허용 |

### 2.3 Structure tree vs Call Activity / 구조 트리 vs 하위프로세스

| Mechanism | EN role | KO 역할 |
|-----------|---------|---------|
| **Tree** (`parent_map_id` + level) | Catalog / “where it sits” | 분류·위치 |
| **Subprocess link** (`linked_map_id`) | Canvas drill-down | 캔버스 드릴다운 |

**Copy / 카피:** Tree = classification. Link = drill-down.  
**트리는 분류, 링크는 드릴다운.** 혼동 금지.

### 2.4 L3 vs L4 / 프로세스 vs 세부 프로세스

| Test / 판별 | L3 Process | L4 Sub-Process |
|-------------|------------|----------------|
| Clear start/end? / 시작·종료 분명? | Yes / 예 | Often inherits parent / 상위에 의존 |
| Standalone publish? / 단독 게시? | Yes / 가능 | Awkward alone / 단독 어색 |
| Question / 질문 | End-to-end outcome? | Which segment inside? |

### 2.5 L5 performer / 태스크 수행 주체

Do **not** add level 6. Use attribute:

| Field | Values |
|-------|--------|
| `performer_type` | `human` \| `system` \| `both` \| `""` |

### 2.6 Org chart ≠ workflow / 조직도 ≠ 워크플로

Employee `org_l1`…`org_l5` = organization.  
`workflow_level` = how work decomposes. Keep separate.

---

## 3. Data model / 데이터 모델

```text
process_maps
  workflow_level   1..5 (default 3)
  parent_map_id    optional FK

nodes
  performer_type   human|system|both|""
```

---

## 4. Inquire alignment / Inquire 정렬

| Question id | Aligns to / 정렬 |
|-------------|------------------|
| scope | L1 Domain + L3 Process |
| start_end | L3/L4 boundary |
| actors | L5 performers |
| steps | L4 or L5 |
| branches | L4 branches |

Default draft depth: **L3–L5 flow**.

---

## Changelog / 변경 이력

| Date | EN | KO |
|------|----|----|
| 2026-07-11 | Five levels + rules | 5단계·규칙 확정 |
| 2026-07-11 | Bilingual docs + UI lang toggle | 문서 한영 병행·UI 토글 |
