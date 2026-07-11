# Procivio

**Interview → Structure → Map.**  
현업이 **계층형 프로세스맵**을 그리고 **As-Is / To-Be를 버전으로 관리·비교**하는 **프로세스 지식 플랫폼**.

## Highlights

- **캔버스 편집** — 노드·엣지, 그룹, 자동 정렬, 흐름 하이라이트 (React Flow)
- **Call Activity** — 하위프로세스 맵 참조(읽기전용 임베드 + 드릴다운)
- **L1–L5 택소노미 + Structure** — 도메인→기능→프로세스→세부→태스크, parent 트리
- **아키텍처 연결 (O1–O3)** — 구조 갭 리포트 · 개념 사전 · 고정 관계(realizes/variant 등)
- **AI 디스커버리** — 회의록→맵, As-Is/To-Be pair, 인터뷰 수집 링크, 이벤트 로그 CSV 마이닝 MVP
- **BPMN 2.0 subset** — export/import (start/task/gateway/end/callActivity)
- **버전·승인·점유** — Draft→Pending→Published, checkout, 버전 비교
- **RBAC** — 맵별 owner/editor/viewer, 공개/비공개, 승인자, 유저 그룹
- **로그인** — 직원/시드 유저 피커 (`X-Dev-User`). **Keycloak/OIDC 없음**

기능 명세: [`docs/spec.md`](docs/spec.md) · 진행: [`PROGRESS.md`](PROGRESS.md)

## Stack

| 디렉터리 | 스택 | 역할 |
|----------|------|------|
| `frontend/` | Next.js + TypeScript + @xyflow/react | 에디터 UI (**dev :3000**) |
| `backend/` | FastAPI + Python 3.12 | 맵/버전/권한/AI API (** :8000**) |
| `nginx/` | nginx | `/` → frontend, `/api` → backend |
| `docker-compose.yml` | + PostgreSQL 16 | 서버 배포 (호스트 **3333**) |

## Local development (no Docker)

**bash (macOS/Linux):**

```bash
# backend — http://localhost:8000
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# frontend — http://localhost:3000  (/api → backend 프록시)
cd frontend
npm install
npm run dev
```

**PowerShell (Windows):**

```powershell
# backend — http://localhost:8000
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000

# frontend — http://localhost:3000
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** → `/login` 에서 시드/디렉터리 유저 선택.

테스트:

```bash
# backend/
.venv/bin/python -m pytest tests/ -q
.venv/bin/ruff check app/ tests/

# frontend/
npm run lint
npm test
```

## Demo seed

```bash
cd backend
.venv/bin/python -m scripts.reset_db
```

시드 상세: [`docs/db-seed.md`](docs/db-seed.md).  
실제 RBAC 검증: `DEV_ENFORCE_PERMISSIONS=true` + `BPM_SYSADMINS=admin.sys`.

## Server deploy (docker-compose)

```bash
cp .env.example .env   # POSTGRES_PASSWORD, BPM_SYSADMINS 등
docker compose up -d --build
# http://<server>:3333
```

런북: [`docs/deploy.md`](docs/deploy.md).  
앱 nginx는 **3333** (엣지 443/80과 분리). 줄바꿈 LF 고정 (`.gitattributes`).

## Auth model (no Keycloak)

| 구분 | 동작 |
|------|------|
| 프론트 | localStorage 로그인 피커 → 모든 API에 `X-Dev-User: <loginId>` |
| 백엔드 `AUTH_ENABLED=false` (기본) | 헤더 없으면 `dev_user` 폴백, 로컬에선 전원 sysadmin(완화) |
| `AUTH_ENABLED=true` 또는 `DEV_ENFORCE_PERMISSIONS=true` | 실제 역할·BPM_SYSADMINS 적용 |

OIDC / Keycloak / JWT 검증 코드는 **제거됨**.

## License / ops notes

- 사내 온프레 배포 전제 · 라이선스: `docs/brand/license-safe-stack-and-roadmap.md`
- 캔버스 시행착오: `docs/lessons/`
