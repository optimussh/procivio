# Phase A Structure — plan / 구조 완성 계획

> **Status / 상태:** Implemented in-session 2026-07-11  
> **Goal / 목표:** Domain…Task browsing + parent + performer UI  

---

## Architecture / 아키텍처

**EN:** Maps store `workflow_level` + `parent_map_id`.  
`GET /api/maps/structure` builds a tree. `/structure` page + nav. Create dialog parent picker. Node `performer_type`.

**KO:** 맵에 레벨·상위 맵 저장. structure API로 트리. 구조 페이지·네비. 생성 시 parent. 노드 수행 주체.

**Stack / 스택:** FastAPI, Next.js, existing map visibility rules.

---

## Checklist / 체크리스트

### Done / 완료

- [x] Master design bilingual  
- [x] `GET /api/maps/structure` + parent cycle checks  
- [x] Structure page + **Structure** nav tab  
- [x] Create map parent picker  
- [x] `performer_type` on graph + node summary modal  
- [x] Inquire questions L1–L5  
- [x] UI language toggle KO | EN  

### Later Phase B / 이후

- [x] PDF export  
- [x] Templates  
- [x] Home level filter  
- [x] `/legal` NOTICE page  
