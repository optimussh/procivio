"""Auth gating tests — auth_enabled 시 X-Dev-User(또는 Bearer loginId) 필수."""

import pytest
from fastapi.testclient import TestClient

from app.settings import settings


def test_api_open_when_auth_disabled(client: TestClient) -> None:
    # 기본(로컬) 설정 — 헤더 없이도 접근 가능(dev_user 폴백)
    assert client.get("/api/maps").status_code == 200


def test_api_requires_identity_when_auth_enabled(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "auth_enabled", True)

    response = client.get("/api/maps")

    assert response.status_code == 401


def test_api_accepts_x_dev_user_when_auth_enabled(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "auth_enabled", True)

    response = client.get("/api/maps", headers={"X-Dev-User": "admin.kim"})

    assert response.status_code == 200


def test_health_skips_auth(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "auth_enabled", True)

    assert client.get("/api/health").status_code == 200
