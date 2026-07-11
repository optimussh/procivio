"""Workflow level taxonomy — Domain … Task (docs/brand/process-level-taxonomy.md)."""

from __future__ import annotations

from typing import Final

# Relaxed hierarchy: parent may skip intermediate levels (L1→L3 OK).
LEVEL_SKIP_ALLOWED: Final[bool] = True

WORKFLOW_LEVEL_MIN: Final[int] = 1
WORKFLOW_LEVEL_MAX: Final[int] = 5
DEFAULT_WORKFLOW_LEVEL: Final[int] = 3  # Process — default map anchor

# level -> (code, english_name)
WORKFLOW_LEVELS: Final[dict[int, tuple[str, str]]] = {
    1: ("domain", "Domain"),
    2: ("capability", "Capability"),
    3: ("process", "Process"),
    4: ("sub_process", "Sub-Process"),
    5: ("task", "Task"),
}

PERFORMER_TYPES: Final[frozenset[str]] = frozenset({"", "human", "system", "both"})


# Korean display names (parallel with English)
WORKFLOW_LEVELS_KO: Final[dict[int, str]] = {
    1: "도메인",
    2: "핵심 기능",
    3: "프로세스",
    4: "세부 프로세스",
    5: "태스크",
}


def level_label(level: int, lang: str = "ko") -> str:
    """Label with primary + secondary: KO 'L3 프로세스 (Process)', EN 'L3 Process (프로세스)'."""
    code = WORKFLOW_LEVELS.get(level)
    if code is None:
        return f"L{level}"
    en_name = code[1]
    ko_name = WORKFLOW_LEVELS_KO.get(level, "")
    if lang == "en":
        return f"L{level} {en_name} ({ko_name})" if ko_name else f"L{level} {en_name}"
    return f"L{level} {ko_name} ({en_name})" if ko_name else f"L{level} {en_name}"


def is_valid_level(level: int) -> bool:
    return WORKFLOW_LEVEL_MIN <= level <= WORKFLOW_LEVEL_MAX


def parent_level_ok(parent_level: int, child_level: int) -> bool:
    """Whether parent may sit above child under current policy."""
    if not is_valid_level(parent_level) or not is_valid_level(child_level):
        return False
    if parent_level >= child_level:
        return False
    if LEVEL_SKIP_ALLOWED:
        return True
    return parent_level == child_level - 1
