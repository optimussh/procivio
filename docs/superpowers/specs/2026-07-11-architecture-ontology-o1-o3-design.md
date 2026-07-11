# 아키텍처 온톨로지 O1–O3 — 설계·스펙

> **날짜:** 2026-07-11  
> **상태:** 구현  
> **브랜치:** `feat/architecture-ontology-o1-o3`  
> **제품 카피:** “온톨로지 엔진” 대신 **구조 연결 / 개념 사전 / 아키텍처 관계** 를 쓴다.

---

## 0. 경계 (상업화 상한)

| 포함 (O1–O3) | 제외 (이번 에픽 밖) |
|--------------|---------------------|
| 트리 ↔ Call Activity 갭 리포트 | OWL / RDF / SPARQL |
| 개념 사전 + 맵 부착 | 무한 커스텀 엔티티 타입 |
| 고정 관계 타입 ≤ 6 | 추론 엔진 |
| 역참조(callers) + 관계 목록 | 풀 EA (앱·데이터·기술 맵) |
| (추후) 제안형 자동 매칭 | 사람 승인 없는 자동 병합 |

**축 분리 (혼동 금지):**

| 축 | 필드 | 역할 |
|----|------|------|
| 분류 트리 | `parent_map_id` + `workflow_level` | 카탈로그 위치 |
| 드릴다운 | `Node.linked_map_id` | Call Activity |
| 개념 | `concepts` + `process_maps.concept_id` | 공유 정체성 |
| 명시 관계 | `architecture_relations` | realizes / variant / uses 등 |

---

## 1. O1 — 갭 리포트

### API

`GET /api/structure/gaps` → `StructureGapsOut`

### 이슈 종류

| kind | severity | 의미 |
|------|----------|------|
| `missing_parent` | warn | `workflow_level ≥ 2` 인데 `parent_map_id` 없음 |
| `orphan_parent` | error | parent id 가 없거나 소프트삭제됨 |
| `level_skip` | info | parent.level + 1 &lt; child.level (레벨 스킵) |
| `tree_without_call` | warn | 트리상 P의 자식인데, P 그래프에 자식으로의 CA 없음 |
| `call_without_tree` | info | A→B Call 은 있으나 B.parent ≠ A (항상 오류는 아님) |
| `call_target_missing` | error | `linked_map_id` 대상 맵 없음/삭제 |
| `call_target_undesignated` | warn | Call 대상에 `sp_designated_at` 없음 |
| `concept_unlinked` | info | 개념에 부착된 맵이 0건 (O2) |

각 이슈 필드: `kind`, `severity`, `map_id`, `map_name`, `related_map_id?`, `related_map_name?`, `message`.

### 권한

`GET /api/structure` / `list_maps` 와 동일한 **가시 맵** 집합.

### UI

구조(Structure) 페이지 → **갭** 패널: severity별 목록, `/maps/{id}` 링크.

---

## 2. O2 — 개념 사전

### 모델 `concepts`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | PK | |
| name | str(200) | 유일 (앱 레벨 검증) |
| aliases | JSON list[str] | 별칭 |
| workflow_level | int null | 1–5 선택 힌트 |
| description | text | |
| created_by | str | |
| created_at | datetime | |
| status | str | `active` \| `archived` |

### 맵 부착

`process_maps.concept_id` → FK concepts, ON DELETE SET NULL.

### API

| Method | Path | 역할 |
|--------|------|------|
| GET | `/api/concepts` | 인증 |
| POST | `/api/concepts` | 인증 |
| GET | `/api/concepts/{id}` | 인증 |
| PATCH | `/api/concepts/{id}` | 생성자 또는 sysadmin |
| POST | `/api/maps/{id}/concept` | 맵 editor — body `{ concept_id }` 또는 null 해제 |
| GET | `/api/concepts/{id}/maps` | 개념 사용 맵 (가시성 필터) |

### UI

구조 → **개념** 패널: 목록·생성·부착 맵 수 표시.

---

## 3. O3 — 고정 관계 + 역참조

### 관계 타입 (고정 집합, 최대 6)

```text
contains      # 선택 명시; 트리 SoR 는 parent_map_id
realizes      # 예: L3 프로세스가 L2 역량을 실현
calls         # 선택 명시; CA SoR 는 linked_map_id
variant_of    # As-Is/To-Be·사이트 변형
uses          # 프로세스가 시스템/개념을 사용
owned_by      # 맵이 조직 단위 개념에 귀속
```

### 모델 `architecture_relations`

| 컬럼 | 비고 |
|------|------|
| id | PK |
| relation_type | 위 6종 중 하나 |
| source_map_id | nullable FK |
| target_map_id | nullable FK |
| source_concept_id | nullable FK |
| target_concept_id | nullable FK |
| note | str 500 |
| created_by | |
| created_at | |

**규칙:** source 는 map 또는 concept 중 정확히 하나, target 도 동일. 동일 엔드포인트 self-link 금지. 중복(동일 타입+양끝)은 409.

### 파생 엣지 (조회 전용, 저장 안 함)

- `contains` 파생: `parent_map_id`
- `calls` 파생: 맵별 최신 버전 그래프의 `linked_map_id`

### API

| Method | Path |
|--------|------|
| GET | `/api/maps/{id}/callers` — Call 역참조 |
| GET | `/api/maps/{id}/architecture` — 파생 + 명시 관계 |
| GET | `/api/architecture/relations` — 목록 (`map_id` 필터 선택) |
| POST | `/api/architecture/relations` |
| DELETE | `/api/architecture/relations/{id}` |

### UI

구조 → **관계** 패널: 타입 + 소스/타깃 맵으로 생성·목록.

---

## 4. 완료 기준 (Acceptance)

- [ ] pytest: `missing_parent` · `call_target_missing` 감지
- [ ] pytest: 개념 생성 + 맵 부착
- [ ] pytest: 관계 생성 + callers 역참조
- [ ] Structure UI에 갭 / 개념 / 관계 섹션
- [ ] ruff clean; OWL·커스텀 타입 디자이너 없음

---

## 5. 비목표

관계 타입 디자이너, 개념 버전 분기, 다중 부모 DAG, 추론, 전용 자유 그래프 편집 페이지.

---

## 6. 구현 파일 (요약)

| 영역 | 경로 |
|------|------|
| 갭·규칙 | `backend/app/architecture.py` |
| API | `backend/app/routers/architecture.py` |
| 모델 | `Concept`, `ArchitectureRelation`, `ProcessMap.concept_id` |
| UI | `frontend/src/app/structure/page.tsx` |
| 테스트 | `backend/tests/test_architecture.py` |
