# 서버 배포 런북 (docker-compose)

로컬에서 검증한 코드를 서버로 옮겨 docker-compose로 올리는 절차. 파이프라인은 `CLAUDE.md` Operations 참고.

**인증:** Keycloak/OIDC **없음**. 로그인 피커 → API `X-Dev-User`. (선택) 사내 AD LDAP 동기화는 별도.

## 0. 전제조건

- 서버에 Docker / Docker Compose v2
- 코드 전송(scp 또는 git pull) — 줄바꿈 LF (`.gitattributes`)
- (선택) LDAP 서비스 계정·검색 DN — employees 동기화용

## 1. (선택) AD LDAP 사전 준비

| 항목 | 내용 |
|------|------|
| LDAP 서비스 계정 | 읽기 전용 bind DN + 비밀번호 |
| 접속 | LDAPS(636) 권장. StartTLS면 `LDAP_START_TLS=true` |
| 검색 기준 DN | `LDAP_USER_SEARCH_BASE` |
| 초기 관리자 | `SYSTEM_ADMIN_LOGIN_IDS` / `BPM_SYSADMINS` |

## 2. `.env` 작성

```bash
cp .env.example .env
```

```
APP_PORT=3333
POSTGRES_USER=processmap
POSTGRES_PASSWORD=<강한 비밀번호>
POSTGRES_DB=processmap

# 로그인: false=헤더 없으면 dev 폴백. true=X-Dev-User 필수 + 실제 RBAC
AUTH_ENABLED=false
DEV_ENFORCE_PERMISSIONS=false
BPM_SYSADMINS=admin.sys

# (선택) LDAP
LDAP_URL=
LDAP_BIND_DN=
LDAP_BIND_CREDENTIALS=
LDAP_USER_SEARCH_BASE=
LDAP_START_TLS=false
SYSTEM_ADMIN_LOGIN_IDS=

# AI (선택)
AI_ENABLED=false
```

- LDAP 4종(`URL`/`BIND_DN`/`CREDENTIALS`/`SEARCH_BASE`)이 모두 채워져야 `ldap_enabled`.
- 프론트는 OIDC 빌드 args 없음 — 재빌드는 코드 변경 시.

## 3. 배포

```bash
docker compose up -d --build
# http://<서버>:3333
```

- 컨테이너 내부 frontend 포트 **3000**, nginx가 프록시.
- DB 스키마는 backend 기동 시 `create_all` (+ 컬럼 보강).
- 데모 시드(주의: drop_all): `docker compose exec backend python -m scripts.reset_db`

## 4. 헬스체크

```bash
docker compose ps
curl -s http://localhost:3333/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3333/
```

브라우저: `/login` → 유저 선택 → 홈. 관리자는 `BPM_SYSADMINS` / `SYSTEM_ADMIN_LOGIN_IDS`.

## 5. 트러블슈팅

| 증상 | 확인 |
|------|------|
| `/api/*` 401 | `AUTH_ENABLED=true`인데 `X-Dev-User` 없음 — 로그인 피커로 재로그인 |
| 관리자 UI 안 보임 | `BPM_SYSADMINS` loginId 정확 여부 |
| db 연결 실패 | `docker compose logs db` |
| 전체 동기화 503 | LDAP 4종 미설정 |
| 노드 생성 무반응 + randomUUID | 평문 HTTP insecure context — `genId()` 사용 빌드인지 |

로그: `docker compose logs -f backend` / `frontend` / `proxy`

## 6. 보안 메모

- LDAP 비밀번호는 `.env` only, git 금지.
- `AUTH_ENABLED=false` 에서는 `X-Dev-User` 를 신뢰(개발·신뢰 네트워크). 공개망이면 `true` + 네트워크 접근 통제.
- 노드 id는 `frontend/src/lib/id.ts` `genId()` (Web Crypto 없이도 동작).

## 7. 로컬 포트

| 서비스 | 포트 |
|--------|------|
| frontend `npm run dev` | **3000** |
| backend uvicorn | 8000 |
| compose 앱 nginx | 3333 (호스트) |
