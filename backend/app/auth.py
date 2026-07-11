"""요청 사용자 식별 — X-Dev-User 헤더 기반 (OIDC/Keycloak 없음).

settings.auth_enabled=False: 헤더 없으면 settings.dev_user 폴백 (로컬 기본).
settings.auth_enabled=True: X-Dev-User(또는 Bearer <loginId> 평문) 필수 — 없으면 401.
권한 강제(is_sysadmin 차별)는 auth_enabled / dev_enforce_permissions 로 제어.
"""

from fastapi import Depends, Header, HTTPException

from app.permissions.logic import is_sysadmin
from app.settings import settings


def get_current_user(
    authorization: str | None = Header(default=None),
    x_dev_user: str | None = Header(default=None),
) -> str:
    """요청 사용자 loginId. JWT 검증 없음 — 프론트 로그인 피커가 X-Dev-User 로 전달."""
    if x_dev_user and x_dev_user.strip():
        return x_dev_user.strip()

    # 선택: Authorization: Bearer <loginId> (JWT 아님 — 점 없는 평문 id)
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        if token and "." not in token:
            return token

    if not settings.auth_enabled:
        return settings.dev_user

    raise HTTPException(
        status_code=401,
        detail="missing user identity (X-Dev-User header required)",
    )


async def require_sysadmin(login_id: str = Depends(get_current_user)) -> str:
    """시스템 관리자(sysadmin)만 — 아니면 403."""
    if not is_sysadmin(login_id):
        raise HTTPException(status_code=403, detail="system admin only")
    return login_id
