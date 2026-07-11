"""Workflow level taxonomy helpers + map create fields."""

from __future__ import annotations

from app.workflow_levels import (
    DEFAULT_WORKFLOW_LEVEL,
    level_label,
    parent_level_ok,
    WORKFLOW_LEVELS,
)


def test_five_english_names() -> None:
    assert WORKFLOW_LEVELS[1][1] == "Domain"
    assert WORKFLOW_LEVELS[2][1] == "Capability"
    assert WORKFLOW_LEVELS[3][1] == "Process"
    assert WORKFLOW_LEVELS[4][1] == "Sub-Process"
    assert WORKFLOW_LEVELS[5][1] == "Task"
    assert DEFAULT_WORKFLOW_LEVEL == 3


def test_level_label() -> None:
    assert level_label(3, "ko") == "L3 프로세스 (Process)"
    assert level_label(3, "en") == "L3 Process (프로세스)"
    assert level_label(1, "ko") == "L1 도메인 (Domain)"


def test_parent_level_ok_allows_skip() -> None:
    # relaxed: L1 may parent L3
    assert parent_level_ok(1, 3) is True
    assert parent_level_ok(2, 5) is True
    assert parent_level_ok(3, 3) is False
    assert parent_level_ok(4, 2) is False
