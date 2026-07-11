# SaaS feasibility & market bench / 사업 타당성·시장 벤치

> **Updated / 갱신:** 2026-07-11  
> **EN:** Market size, pricing, OSS, GTM for process-mapping SaaS.  
> **KO:** 프로세스 맵 SaaS 시장·가격·오픈소스·GTM 정리.  
> **Parts / 구성:** (A) Research summary · (B) Feature bench · (C) Procivio conclusions  
> **Also / 함께:** [`competitive-benchmark.md`](./competitive-benchmark.md) · [`procivio.md`](./procivio.md) · [`license-safe-stack-and-roadmap.md`](./license-safe-stack-and-roadmap.md)  
> **Limits / 한계:** No copying competitor UI/pricing contracts. Market figures are estimates.  
> 타사 UI·계약 가격 복제 금지. 시장 수치는 추정치.  
> **Doc language:** EN+KO preferred — see [`../README.md`](../README.md).

---

## A. 조사 요약 — 시장·가격·기술·GTM

### A1. 패러다임 변화

| 과거 | 현재·향후 |
|------|-----------|
| 화이트보드·수동 다이어그램 (정태) | 클라우드 네이티브 + 생성형 AI + (선택) 프로세스 마이닝 |
| BA/컨설턴트 중심 문서화 | 실무자 self-serve + 전사 거버넌스 SoR |
| 대기업 SI·온프레 중심 | 클라우드 52–64%대 주류, SME 성장(조사상 ~20% CAGR 언급) |

**기회 문장 (Procivio):**  
문서화 툴이 아니라 **「일하는 방식의 가시화 → 구조 DB → 거버넌스 맵」** 인프라로 판다.  
마이닝/실행은 초기 내장하지 않고, 이후 Add-on·연동으로 확장.

---

### A2. 글로벌·국내 시장 규모 (조사 수치 정리)

> 기관마다 BPM 정의(다이어그램만 vs RPA/마이닝 포함)가 달라 절대 금액은 범위로 읽는다.

#### 글로벌 BPM (조사 표)

| 조사 기관 | 2025 (est.) | 2026 (est.) | 장기 | CAGR |
|-----------|-------------|-------------|------|------|
| Fortune Business Insights | $21.51B | $25.88B | $91.87B (2034) | 17.2% |
| Research and Markets | $22.09B | $26.04B | $45.72B (2030) | 15.1% |
| Precedence Research | $20.84B | $23.86B | $76.26B (2035) | 13.85% |
| Mordor Intelligence | $16.71B | $18.68B | $30.26B (2031) | 10.13% |
| Research Nester | $18.10B | $19.80B | $40.90B (2035) | 9.5% |
| Business Research Insights | — | $4.07B (2026)* | $5.93B (2035) | 4.3% |

\* 정의 범위가 좁은 계열로 보이며 타 기관과 직접 비교 주의.

**해석:** 보수적으로도 두 자릿수 CAGR 구간이 다수. 성장 동인 = 표준화, AI 최적화, Low-code, 다부서 자동화.

**배포:** 클라우드 비중 52–64%대(조사). 온프레는 보안·공공·레거시 통합 수요로 잔존 → **Procivio compose 온프레는 납품 차별점**.

**산업:** BFSI ~18.7–24.5%, IT·통신 ~21.8% 등 규제·오케스트레이션 수요 강함.

#### 프로세스 마이닝 (별도 고성장)

| 구간 | 조사 언급 |
|------|-----------|
| 2023 | ~$1.8B |
| 2028 | ~$12.1B |
| 2030 | ~$23.3B |
| CAGR | ~36–45% |

Celonis·Signavio PI 등이 “낭비 증명 → 엔터프라이즈 락인”.  
→ Procivio는 **초기 풀 마이닝 비목표**, 후기 **Lite Mining Add-on / 연동** (조사 GTM 3단계와 정합).

#### 한국

| 항목 | 조사 언급 |
|------|-----------|
| 2025 규모 | ~$332.6M (약 4,500억 원 수준 언급) |
| 2034 | CAGR ~8.46% → ~$716.7M |
| 전통 강자 | HandySoft, TmaxSoft(BizMaster 등) — 전자결재·SI·공공/금융 |
| 신흥 | Puzzle Data ProDiscovery (마이닝), ESG 확장(ProESGNet 언급) |
| 정책 | 스마트팩토리·디지털 뉴딜 → 중견 제조 클라우드 도입 토양 |

**국내 GTM 함의:** SI 레거시와 정면 대결보다  
① AI 맵/인터뷰 속도 · ② 거버넌스 경량 SaaS/온프레 · ③ 마이닝 대체 전 “As-Is 구조화” 포지션.

---

### A3. 가격 모델 벤치 (유형만 — 영업 시 최신 공개가 재확인)

#### A3.1 Per-Seat (다이어그램·협업)

| 제품 유형 | 대표 | 모델 특징 (조사) | Procivio 함의 |
|-----------|------|------------------|---------------|
| 범용 다이어그램 | Lucidchart | Free 제한 + Individual ~$9 / Team ~$10·최소인원 절벽 | Freemium 설계 시 1–2인 절벽 완화 |
| 엔터프라이즈 문서 | Visio | Plan1 ~$5 / Plan2(BPMN) ~$15, 협업 상대적 약함 | “M365 파일 난립 해결” 포지션 |
| AI 초안 | BA Copilot류 | 텍스트/이미지→맵, 로그인 없이 1맵 등 | **Aha moment** = AI 생성 |
| SOP 캡처 | Scribe/Tango | Pro ~$13–29, 화면 캡처 SOP | 맵+SOP 통합 시 경쟁·보완 |

공통 전술: 볼륨 할인, 다년 10–30%, PLG.

#### A3.2 Usage / Volume (실행·마이닝)

| 유형 | 대표 | 과금 축 (조사) | 진입 장벽 |
|------|------|----------------|-----------|
| 실행 엔진 | Camunda | OSS 개발 무료 → SaaS Pro ~$49/월 → 엔터 트랜잭션·클러스터 (연 $175k+ 언급 등) | 개발자 락인 후 종량 |
| 마이닝 | Celonis | APC(데이터 용량) 맞춤형; 파일럿 연 $150k급 언급, 대형 TCO 수억~천만$ | ROI 컨설팅형 판매 |

**신규 사업 제언 (조사 3.3 + Procivio 정렬)**

| 단계 | 모델 | 가격 감각 (조사) | 상품 |
|------|------|------------------|------|
| 1 | Freemium + Per-Seat | Free 1–2맵 / AI 체험 · Pro **$15–25/유저/월** | 협업, export, AI 한도 상향 |
| 2 | B2B 팀·컴플라이언스 | **$50–100+/유저/월** 또는 맵·시트 팩 | SOP, Read receipt, 승인 거버넌스 |
| 3 | Usage Add-on | 트랜잭션·연동 이벤트·시뮬레이션 분 | Lite Mining, CRM/Jira 연동 |

초기 거대 엔터 세일즈 단독 의존 지양 → **PLG + 중견 온프레 납품** 병행이 Procivio 현실과 맞음.

---

### A4. 오픈소스 벤치 (코어 엔진)

| 기술 | 역할 | 강점 | 리스크·라이선스 주의 | Procivio 현황 |
|------|------|------|---------------------|---------------|
| **@xyflow/react (React Flow)** | 노드 캔버스 | 커스텀 UI, 인터랙션, 개발 속도 | 라이선스 조건 준수(사용 버전 확인) | **이미 채택** |
| **bpmn-js (bpmn.io)** | BPMN 2.0 편집·XML | 표준 상호운용, 벤더 락인 완화 영업 | Camunda 생태계 의존·학습곡선 | **미채택 → P2 export/에디터 후보** |
| **Mermaid.js** | 텍스트→다이어그램 | 문서·PR·경량 미리보기 | 복잡한 엔터 맵·편집 UX 한계 | 문서/AI 초안 보조 후보 |

**원칙:** 렌더러는 오픈소스, 차별은 **AI 인터뷰·Structure DB·거버넌스·버전**에 집중 (조사 결론과 동일).  
상업 이용 시 각 패키지 LICENSE· monorepo 고지 의무 점검 체크리스트 유지.

---

### A5. 조사에서 강조한 차별 기능 → 우선순위 매핑

| 조사 강조 기능 | 유형 | Procivio 우선 | 비고 |
|----------------|------|:-------------:|------|
| 자연어·문서 → 다이어그램 자동 생성 | AI | **P0** | Inquire + 문서 업로드 |
| 인터뷰/대화형 구조화 | AI | **P0** | 브랜드 핵심 |
| BPMN 2.0 호환 export | 표준 | **P2** (영업 문구는 준비) | bpmn-js 또는 변환 레이어 |
| 실시간 멀티플레이어 협업 | 협업 | **P2** | presence 먼저 가능 |
| 토큰 흐름·병목 시뮬레이션 | 분석 | **P2** | duration 메타 기반 경량부터 |
| 인터랙티브 SOP + Read receipts | 지식 | **P1** | 매뉴얼·온보딩 |
| 프로세스 변경 시 문서 일괄 갱신 | AI | **P1** | 매뉴얼 연동 |
| Lite Process Mining | 분석 | **P2 Add-on** | Celonis 대체 아님, SMB 공략 |
| CRM/ITSM 연동 (SF/Jira) | 연동 | **P2** | 처리시간 오버레이 |
| Freemium PLG | 사업 | 사업 모델 | 제품 플래그·쿼터 |

---

### A6. GTM 3단계 (조사 §6) × Procivio 모듈

```text
[1] AI 생성기 Aha          →  Procivio Inquire + Canvas
[2] SOP·Compliance SoR     →  Structure + Manual + 승인/버전 (이미 강함)
[3] Lite Mining + Sim      →  Add-on / Usage 과금
```

| 단계 | 포지셔닝 한 줄 | 성공 지표 |
|------|----------------|-----------|
| 1 | “문서·말이 맵이 된다” | Time-to-first-map &lt; 10분, AI 세션 전환율 |
| 2 | “승인된 프로세스 지식 시스템” | 게시 맵 수, 부서 확산, 갱신 주기 |
| 3 | “맵 위에 실제 병목이 보인다” | Add-on ARPU, 연동 고객 수 |

---

## B. 기능 비교 통합표 (조사 제품군 + Procivio)

범례: ● 강 · ◐ 부분 · ○ 약 · — 비목표

### B1. 제품군 포지션

| 제품/군 | 주력 가치 | 가격 성격 | Procivio 대응 |
|---------|-----------|-----------|---------------|
| Lucid / Miro / Visio | 그림·협업 | Per-seat | Canvas 경쟁, 거버넌스로 차별 |
| BA Copilot류 | AI 초안 BPMN | Freemium | Inquire로 정면 + 저장소 우위 |
| Scribe/Tango | 화면 SOP | Per-seat | SOP 모듈로 보완 관계 |
| Signavio / ARIS | 엔터 저장소·마이닝 | 엔터 견적 | 경량 거버넌스·온프레 대안 |
| Camunda | 실행 | OSS+Usage | 연동, 내장 비목표 |
| Celonis | 마이닝 ROI | APC 맞춤 | Lite/연동만 |
| 국내 SI BPM | 맞춤 구축 | 프로젝트 | 패키지 SaaS 속도 |
| Puzzle Data | 마이닝 | 엔터 | 협업·선후 관계 가능 |
| **Procivio** | **인터뷰→구조 DB→거버넌스 맵** | Freemium→Seat→Add-on | — |

### B2. 핵심 역량 스코어카드 (10점 감각)

| 역량 | Lucid | Visio | Signavio | Camunda | Celonis | AI맵 툴 | **Procivio 현재** | **P0 후 목표** |
|------|:-----:|:-----:|:--------:|:-------:|:-------:|:------:|:-----------------:|:--------------:|
| 그리기 UX | 9 | 7 | 7 | 6 | 4 | 7 | **8** | 8 |
| AI 초안 | 5 | 3 | 5 | 2 | 4 | 8 | **5** | **8** |
| 인터뷰 구조화 | 1 | 1 | 2 | 1 | 2 | 3 | **4** | **9** |
| 계층 저장소 | 2 | 2 | 9 | 4 | 5 | 2 | **6** | **9** |
| 버전·승인 | 2 | 2 | 9 | 5 | 4 | 2 | **9** | 9 |
| RBAC·온프레 | 5 | 6 | 9 | 8 | 8 | 3 | **8** | 8 |
| BPMN 표준 | 6 | 7 | 9 | 10 | 3 | 7 | **2** | 5 |
| 실시간 협업 | 9 | 4 | 7 | 3 | 2 | 4 | **2** | 4 |
| SOP·교육 | 3 | 2 | 6 | 2 | 2 | 3 | **4** | 7 |
| 마이닝 | 1 | 1 | 8 | 2 | 10 | 2 | **1** | 2 |
| 실행 엔진 | 1 | 1 | 4 | 10 | 2 | 1 | **1** | 1 |

**한 줄:** 지금 이기는 축 = **거버넌스(버전·승인·RBAC·비교)**.  
벌려야 할 축 = **AI 인터뷰·구조화**.  
나중에 돈 되는 축 = **SOP + Lite Mining Add-on**.

---

## C. Procivio 로드맵에 꽂는 구체 기능 (상업 안전 설계)

### C1. 조사 GTM 1단계 — “Aha” 제품화

| ID | 기능 | 수용 기준 | 오픈소스 |
|----|------|-----------|----------|
| G1-1 | 문서 업로드→맵 초안 | PDF/MD/DOCX 1개 → 3분 내 graph 제안 | RF 렌더 |
| G1-2 | 인터뷰 시퀀스 | 10턴 내 L2+활동 3개 | — |
| G1-3 | Freemium 쿼터 | 맵 N개·AI 메시지 M회/월 | — |
| G1-4 | 공유 링크 (읽기) | 비로그인 뷰 (선택) | — |

### C2. GTM 2단계 — SOP·Compliance

| ID | 기능 | 수용 기준 | 기존 자산 |
|----|------|-----------|-----------|
| G2-1 | 노드별 가이드(텍스트·URL·미디어) | 인스펙터 첨부 | manual, url |
| G2-2 | Read receipt / 교육 완료 | 버전 게시본 기준 체크 | 신규 |
| G2-3 | 변경 시 관련 문서 알림 | 게시 diff → 담당자 알림 | 알림 인프라 |
| G2-4 | 승인·감사 | 이미 있는 워크플로 UI 강화 | **강점** |

### C3. GTM 3단계 — Lite Mining·Sim

| ID | 기능 | 수용 기준 | 비고 |
|----|------|-----------|------|
| G3-1 | Jira/SF 처리시간 pull | 노드 duration 오버레이 색 | Usage 과금 |
| G3-2 | 토큰/리드타임 간이 sim | 메타 합산 what-if | Celonis 비복제 |
| G3-3 | BPMN XML export | 핵심 노드 타입 왕복 | bpmn-js 검토 |

### C4. 하지 않을 것 (조사·상업 리스크 정렬)

- Celonis급 풀 마이닝 엔진 자체 개발 (초기)  
- Camunda 대체 실행 엔진 내장  
- 타사 UI·가격표·ROI 수치 무단 재인용 마케팅 (출처 없이)  
- 오픈소스 라이선스 무시 재배포  

---

## D. 타당성 결론 (조사 §7 + Procivio 현실)

| 질문 | 결론 |
|------|------|
| 시장이 큰가? | **예** — 글로벌 두 자릿수 CAGR 다수, 국내도 견조 + 마이닝 고성장 |
| 진입 가능한가? | **예** — React Flow 기반 제품 **이미 존재**, 거버넌스 선구축 |
| 차별이 가능한가? | **예** — AI 인터뷰→계층 DB는 다이어그램 툴·풀 마이닝 사이 공백 |
| 어떻게 돈 버나? | Freemium/Seat → 팀 SOP 구독 → Lite Mining·연동 Usage |
| 위험은? | Visio/Lucid 저가 비교, Signavio 브랜드, AI 원가, 국내 SI 관성 |

**Go 판정 (제품 관점):**  
타당. 다만 “또 하나의 맵 그리기 SaaS”가 아니라  
**Procivio = Interview-driven Process Knowledge Platform** 으로 고정할 것.

**90일 실행 초점**

1. Inquire(문서+인터뷰) Aha  
2. Structure 트리·레벨  
3. AI diff 수락 + 키 캐스케이드 안정  
4. PDF/PPT export (납품)  
5. 가격 티어·쿼터 설계 초안  

---

## E. 원 조사 목차 대응표

| 조사 목차 | 본 문서 |
|-----------|---------|
| 1 서론·패러다임 | A1 |
| 2 시장 규모·국내 | A2 |
| 3 Pricing | A3 |
| 4 오픈소스 | A4 |
| 5–6 차별·GTM (조사 중반부 포함) | A5–A6, C |
| 7 결론 | D |
| 기능 상세 매트릭스 | B + [`competitive-benchmark.md`](./competitive-benchmark.md) |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-11 | 사용자 BPM SaaS 타당성·벤치 조사 전문을 구조화 통합, Procivio 로드맵·가격·GTM 매핑 |
