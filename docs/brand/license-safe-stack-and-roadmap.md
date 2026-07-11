# License-safe stack & roadmap / 라이선스 안전 스택·로드맵

> **Updated / 갱신:** 2026-07-11  
> **Inputs / 입력:** (1) Commercial license review, avoid n8n Fair-code, MIT/Apache stack  
> (2) Market bench [`saas-feasibility-and-benchmark.md`](./saas-feasibility-and-benchmark.md)  
> (3) Codebase: Next.js + **@xyflow/react MIT** + FastAPI + versions/RBAC/AI  
> **Goal / 목적:** Commercial SaaS & on-prem **without license pollution**.  
> 라이선스 오염 없이 SaaS·온프레 납품 가능한 방향.

---

## 0. Bottom line / 한 줄 결론

| Question / 질문 | Answer / 답 |
|-----------------|-------------|
| Do first? / 먼저? | License inventory + fix product boundary (map knowledge ≠ runtime) |
| Fork n8n? | **No** — Fair-code limits competing SaaS / 비권장 |
| Canvas? | Keep **React Flow** (MIT) / **유지** |
| Temporal/Argo now? | **No** — Phase C optional / 지금은 아니오 |
| Success v1? | Clean licenses + Interview→Structure→governed Map |

---

## 1. 왜 라이선스가 로드맵보다 앞서는가

### 1.1 위험 유형

| 유형 | 예 | SaaS 상업화 시 |
|------|-----|----------------|
| **Fair-code / Sustainable Use** | n8n (및 유사 “소스 공개 but 경쟁 SaaS 제한”) | 호스팅 재판매·경쟁 서비스에 **별도 상용 계약** 필요 가능 |
| **Copyleft 강한 GPL** | 일부 엔진·UI | 결합 방식에 따라 자사 코드 공개 의무 리스크 |
| **MIT / Apache 2.0 / BSD** | React Flow, Temporal, Airflow, Dify 코어 등 | **일반적으로 상업 SaaS 가능** (고지·NOTICE·특허 조항 준수) |
| **“MIT 변형 / 자체 라이선스”** | bpmn.io 계열 등 | **문구 재확인 필수** — 상업 가능해도 고지·상표 조건 다름 |

### 1.2 Procivio 원칙 (확정 제안)

1. **프로덕션 런타임에 Fair-code / 소스-available 제한 라이선스 금지** (n8n 코어 임베드·화이트라벨 금지).  
2. 신규 의존성은 **MIT / Apache-2.0 / BSD-3** 우선. 그 외는 법무 리뷰 게이트.  
3. bpmn-js 등은 “MIT 변형” 주장만 믿지 말고 **LICENSE 파일·NOTICE·상표 조항**을 릴리스 체크리스트에 넣는다.  
4. Dify/Flowise 등 **플랫폼 통째 임베드**보다, **프로토콜·아이디어·얇은 연동**을 우선 (제품 경계 오염·운영 부담 감소).  
5. `frontend/package-lock.json` · `backend/requirements*.txt` 에 대해 **주기적 license scan** (CI).

### 1.3 n8n을 쓰지 않는 이유 (요약)

- 기능은 자동화 SaaS에 적합하나, **Sustainable Use / Fair-code** 계열은  
  “소스 공개 = 맘대로 SaaS”가 아님.  
- Procivio를 **멀티테넌트 클라우드 + 유료 구독**으로 키울 계획이면  
  **엔터프라이즈 계약 또는 전면 재작성** 리스크를 초기에 안는 것.  
- 대안: **자사 그래프 모델(이미 있음) + MIT 캔버스 + (후기) MIT/Apache 실행 엔진**.

---

## 2. 제품 정체성 분리 (가장 중요한 전략 판단)

제시된 Top10 분석은 **세 레이어**를 전제한다:

```text
[UI 캔버스]  →  [실행 오케스트레이션]  →  [커넥터·AI 에이전트]
 React Flow      Temporal / Argo / Airflow    Dify/Flowise 사상 · REST/Webhook
```

반면 **현재 Procivio**는:

```text
[UI 캔버스]  →  [프로세스 지식 SoR]  →  [거버넌스·AI 구조화]
 React Flow      맵/버전/노드/엣지 DB      승인·RBAC·Inquire(예정)
```

| | **프로세스 맵 (Knowledge)** | **자동화 워크플로 (Runtime)** |
|--|---------------------------|------------------------------|
| 목적 | 업무가 어떻게 돌아가는지 **문서·표준·승인** | 시스템이 **실제로 돌리는** 파이프라인 |
| 그래프 | 사람·부서·의사결정·SOP | API 호출·컨테이너·재시도·스케줄 |
| 고객 | 현업·품질·기획·컨설팅 | 개발·데이터·MLOps·자동화팀 |
| 과금 | Seat / 맵 / 거버넌스 | Usage / 실행 수 / 워커 |
| 지금 코드 | **여기 있음** | **거의 없음** (의도적) |

### 권장 포지션 (Procivio)

> **Phase A–B: Knowledge Process Map Platform (라이선스 클린 SaaS)**  
> **Phase C: 선택적 “Run” 어댑터** — 맵의 일부 노드를 Temporal/Argo **외부 엔진**에 넘김 (엔진을 제품에 흡수하지 않음).

한 제품 안에 n8n급 실행 + Signavio급 거버넌스 + Celonis급 마이닝을 동시에 넣으면  
**범위 폭발 + 라이선스/인프라 비용**으로 실패 확률이 높다.

---

## 3. Top10 오픈소스 평가 × Procivio 채택 등급

> Star·라이선스는 **채택 전 재확인**. 등급: **Adopt / Trial / Assess / Hold**

### 3.1 UI · 시각화

| # | 프로젝트 | 라이선스(주장) | 역할 | 등급 | Procivio 판단 |
|---|----------|----------------|------|:----:|---------------|
| 1 | **React Flow (xyflow)** | MIT | 노드 캔버스 | **Adopt** | **이미 사용.** 커스텀 노드·미니맵·엣지 유지. 상업 SaaS 적합. |
| 2 | **Mermaid.js** | MIT | 텍스트→다이어그램 | **Trial** | AI가 Mermaid/DSL 생성 → 미리보기 또는 임포트. 메인 에디터 대체 ❌ |
| 3 | **bpmn-js** | bpmn.io (MIT 계열 변형 — **전문 확인**) | BPMN 2.0 | **Assess→Trial** | 메인 UX는 React Flow 유지. **Export/Import·엔터 납품** 시 뷰어/변환 레이어로 검토 |

### 3.2 AI · 에이전트 워크플로 플랫폼

| # | 프로젝트 | 라이선스(주장) | 역할 | 등급 | Procivio 판단 |
|---|----------|----------------|------|:----:|---------------|
| 4 | **Dify** | Apache-2.0* | LLM 앱·RAG·플로우 UI | **Assess** | **통째 임베드 비권장** (제품이 Dify가 됨). RAG/프롬프트 패턴만 참고. 필요 시 **사이드카 연동**. |
| 5 | **Flowise** | Apache-2.0* | LangChain 노드 UI | **Assess** | 프로토타이핑 도구. 상용 코어에 병합 ❌. 아이디어·커넥터 목록 참고. |

\* 배포 시 부가 컴포넌트·EE 모듈 라이선스 분리 여부 확인.

### 3.3 실행 · 오케스트레이션

| # | 프로젝트 | 라이선스(주장) | 역할 | 등급 | Procivio 판단 |
|---|----------|----------------|------|:----:|---------------|
| 6 | **Apache Airflow** | Apache-2.0 | 배치 DAG 스케줄 | **Trial (Phase C-데이터)** | ETL/배치·리포트 파이프라인. **인터랙티브 업무 맵 엔진으로는 무거움**. |
| 7 | **Temporal** | MIT | Stateful 워크플로 | **Trial (Phase C-런타임)** | 장기 실행·재시도·금융급 신뢰. **“맵 실행” 백엔드 1순위 후보**. UI는 자사 React Flow. |
| 8 | **Node-RED** | Apache-2.0 | 이벤트 로우코드 | **Hold** | IoT·웹훅에 강. B2B 프로세스 거버넌스 UX와 결이 다름. |
| 9 | **Argo Workflows** | Apache-2.0 | K8s 컨테이너 DAG | **Trial (Phase C-GPU/K8s)** | vLLM/Comfy 등 **컨테이너 잡**에 강. K8s 전제 고객·GPU 팜. |
| 10 | **Activepieces** | MIT 코어* | Zapier형 자동화 | **Assess** | 커넥터 생태계 참고. 코어 임베드 전 EE/클라우드 조항 재확인. |

### 3.4 명시적 제외

| 프로젝트 | 이유 |
|----------|------|
| **n8n** | Fair-code — 상업 SaaS 기본 경로 부적합 |
| Camunda 상용 모듈 무단 사용 | 실행 엔진 내장이 1차 목표가 아님 + 라이선스 분리 |
| 임의 GPL 라이브러리 딥링크 | copyleft 오염 위험 |

---

## 4. 권장 타깃 아키텍처 (단계별)

### 4.1 Phase A — 지금 (Knowledge Map) ★ 상업화 1차

```text
Browser
  └─ Next.js + React Flow (@xyflow) MIT
        │  graph JSON (nodes/edges/groups/versions)
        ▼
  FastAPI + PostgreSQL/SQLite
        │  RBAC · checkout · approval · AI cascade (Gemini keys)
        ▼
  (옵션) Keycloak OIDC — UI는 필요할 때만
```

**라이선스 상태:** 핵심 캔버스 MIT 경로.  
**팔 것:** 맵 저장소, 버전, 승인, 비교, AI 구조화, 온프레 납품.

### 4.2 Phase B — 구조·AI·표준 (차별화)

```text
Inquire (LLM 인터뷰/문서) ──► Structure DB (L0–Ln) ──► Canvas (React Flow)
         │                         │
         │                         ├─ Manual/SOP 링크
         │                         └─ (Trial) Mermaid preview / BPMN export
         └─ 기존 AI_API_KEY 캐스케이드
```

**새 의존성 최소:** Mermaid(MIT), 필요 시 bpmn-js(라이선스 확인 후).  
**안 넣음:** Temporal/Airflow/Dify 본체.

### 4.3 Phase C — 실행 어댑터 (옵션 제품 라인)

```text
Procivio Canvas (설계·승인된 그래프)
        │  "Run" 또는 webhook export
        ▼
  Adapter API (자사, Apache/MIT 코드)
        ├─► Temporal Worker  (장거래·사람 승인 스텝)
        ├─► Argo Workflows   (GPU/vLLM/Comfy 컨테이너)
        └─► Airflow DAG gen  (배치 리포트)
```

**핵심:** 실행 엔진은 **옆에 두는 인프라**이지, 맵 에디터를 대체하지 않음.  
고객 유형:

| 고객 | 엔진 |
|------|------|
| 일반 기업 프로세스 표준화 | Phase A–B만 |
| AI/GPU 파이프라인 | Argo (+ React Flow 설계) |
| 미션 크리티컬 장기 트랜잭션 | Temporal |
| 데이터 배치 | Airflow |

조사에서 제안한  
“React Flow JSON → Temporal/Argo 실행” 은 **Phase C 아키텍처로 채택**,  
**Phase A MVP 정의에서는 제외**.

---

## 5. 개발 로드맵 (보완 제안)

### 5.1 원칙

1. **License gate → Product wedge → Runtime optional**  
2. 거버넌스 자산(이미 강함)을 버리지 말 것  
3. 자동화 사업으로 피벗하더라도 **맵 SoR가 소스 오브 트루스**

### 5.2 타임라인

#### Now (0–2주) — 라이선스·경계 고정

| 작업 | 산출 |
|------|------|
| 의존성 license scan (npm + pip) | `docs/brand/license-inventory.md` (자동 생성 가능) |
| NOTICE/고지 템플릿 | 배포 이미지·SaaS 푸터 |
| 제품 경계 문서 | 본 문서 §2 확정 (경영/개발 공유) |
| n8n/Fair-code 의존 0 유지 | 코드 리뷰 체크 |

#### P0 (1–3개월) — 상업 wedge

| 테마 | 항목 | 라이선스 |
|------|------|----------|
| AI | Inquire 인터뷰·문서→그래프, diff 수락 | 자사 + Gemini API |
| Structure | 레벨1~5(도메인→태스크), 트리+캔버스 — `process-level-taxonomy.md` | 자사 |
| 캔버스 | React Flow 고도화(분기·메타) | MIT 유지 |
| 납품 | PDF/PPT export, 온프레 compose | 자사 |
| 사업 | Freemium 쿼터 설계 | — |

#### P1 (3–6개월) — SoR·SOP

| 테마 | 항목 |
|------|------|
| SOP | 노드 가이드, Read receipt |
| 협업 | 코멘트·멘션 (실시간 전 단계) |
| 표준 | BPMN export 스파이크 (bpmn-js **Assess 통과 시**) |
| AI | Mermaid/DSL 미리보기 병행 |
| 연동 | Webhook out (맵 변경 이벤트) — **실행 엔진 없이** 통합 시작 |

#### P2 (6–12개월) — Runtime 옵션

| 테마 | 항목 | 스택 |
|------|------|------|
| Run Adapter | 승인된 버전 → 실행 스펙 JSON | 자사 |
| Engine A | Temporal workers (재시도·시그널) | MIT |
| Engine B | Argo (GPU/vLLM 잡) | Apache-2.0 |
| 커넥터 | REST/Webhook 카탈로그 (Activepieces 사상, 자체 구현) | 자사 MIT |
| 과금 | Usage (실행 수·워커 분) | — |

#### 이후

- Lite Mining 오버레이 (이벤트 연동)  
- 실시간 멀티플레이어 (CRDT) — 라이선스 클린 라이브러리만  

### 5.3 MVP 정의 (라이선스 클린 상업 MVP)

**포함**

- React Flow 맵 편집·저장  
- 버전·승인·RBAC·비교  
- AI 구조화(키 캐스케이드)  
- 온프레 또는 SaaS 단일 테넌트 납품  
- MIT/Apache 의존성 only  

**제외 (MVP)**

- Temporal/Argo/Airflow 필수 기동  
- Dify/Flowise 내장  
- n8n 호환 레이어  
- 풀 프로세스 마이닝  

---

## 6. 기술 의사결정 기록 (ADR 요약)

| ID | 결정 | 상태 |
|----|------|------|
| ADR-L1 | 상용 런타임에 Fair-code 금지 | 제안·채택 권고 |
| ADR-L2 | 캔버스 = React Flow 유지 | **채택 (현황)** |
| ADR-L3 | 1차 제품 = Knowledge Map, Runtime = Phase C | 제안·채택 권고 |
| ADR-L4 | 실행 필요 시 Temporal(일반) / Argo(GPU) 어댑터 | 제안 |
| ADR-L5 | Dify/Flowise는 임베드 금지, 패턴·연동만 | 제안 |
| ADR-L6 | bpmn-js는 export 경로로 제한 검토 | 제안 |

---

## 7. 리스크 레지스터

| 리스크 | 영향 | 완화 |
|--------|------|------|
| “자동화 플랫폼”으로 범위 팽창 | 출시 지연 | §2 경계, Phase C 게이트 |
| bpmn.io 라이선스 오해 | 법적 | 채택 전 LICENSE 전문 리뷰 |
| Dify 통째 도입 | 제품 종속·운영 부담 | 사이드카 또는 미도입 |
| AI API 원가 | 마진 | 키 캐스케이드·쿼터·Seat 한도 (구현 중) |
| 실행 엔진 운영 난이도 | 온콜·K8s | 엔진을 고객 VPC 옵션으로 |
| 라이선스 드리프트 | 오염 | CI license check |

---

## 8. 기존 벤치·사업 문서와의 정렬

| 문서 | 관계 |
|------|------|
| [`saas-feasibility-and-benchmark.md`](./saas-feasibility-and-benchmark.md) | 시장·가격·GTM — 본 문서가 **기술·라이선스 축** 보완 |
| [`competitive-benchmark.md`](./competitive-benchmark.md) | 기능 P0–P2 — 실행 엔진은 P2/비목표와 일치 |
| [`procivio.md`](./procivio.md) | 브랜드: Interview → Structure → Map — Runtime은 부제 “Run” 모듈로만 |

**GTM 문장 수정 제안**

- Before: “n8n처럼 자동화를 그린다”  
- After: “**업무 프로세스를 인터뷰로 구조화하고 거버넌스하며**, 필요할 때 **승인된 맵을 실행 엔진에 넘긴다**”

---

## 9. 즉시 액션 체크리스트

- [ ] `npx license-checker` / `pip-licenses` 로 현재 트리 스냅샷  
- [ ] 본 문서 ADR-L1~L3 팀 합의  
- [ ] P0: Inquire + Structure (기능 벤치와 동일)  
- [ ] Phase C 전까지 Temporal/Argo **의존성 추가 금지** (스파이크 브랜치만 허용)  
- [ ] 영업 덱에서 n8n/Fair-code 대비 “라이선스 클린 SaaS” 한 장 추가  

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-11 | 라이선스 우선 원칙, Top10 채택 등급, Knowledge vs Runtime 분리, Phase A–C 로드맵, ADR·리스크 |
