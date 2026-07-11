/** Workflow levels Domain…Task — docs/brand/process-level-taxonomy.md
 * UI labels are always bilingual: English + Korean (not English-only).
 */

export const WORKFLOW_LEVELS = [
  {
    level: 1 as const,
    code: "domain",
    nameEn: "Domain",
    nameKo: "도메인",
    tipEn: "Core business area.",
    tipKo: "핵심 비즈 영역.",
  },
  {
    level: 2 as const,
    code: "capability",
    nameEn: "Capability",
    nameKo: "핵심 기능",
    tipEn: "Business capability bundle — not an IT system feature/menu.",
    tipKo: "업무 능력 묶음 — IT 시스템 기능/메뉴가 아닙니다.",
  },
  {
    level: 3 as const,
    code: "process",
    nameEn: "Process",
    nameKo: "프로세스",
    tipEn: "End-to-end business flow (default map level).",
    tipKo: "end-to-end 업무 흐름(맵 기본 레벨).",
  },
  {
    level: 4 as const,
    code: "sub_process",
    nameEn: "Sub-Process",
    nameKo: "세부 프로세스",
    tipEn: "Segment or variant inside a Process.",
    tipKo: "프로세스 안의 구간·변형.",
  },
  {
    level: 5 as const,
    code: "task",
    nameEn: "Task",
    nameKo: "태스크",
    tipEn: "Single unit of work by person and/or system.",
    tipKo: "직원·시스템이 수행하는 단일 과업.",
  },
] as const;

export type WorkflowLevel = (typeof WORKFLOW_LEVELS)[number]["level"];

export const DEFAULT_WORKFLOW_LEVEL: WorkflowLevel = 3;

export type PerformerType = "" | "human" | "system" | "both";

/**
 * Level label follows UI language, with the other language in parentheses.
 * en: "L3 Process (프로세스)" · ko: "L3 프로세스 (Process)"
 * Pass lang from useI18n().lang for platform-wide 한/영 toggle.
 */
export function levelLabel(level: number, lang: "en" | "ko" = "ko"): string {
  const row = WORKFLOW_LEVELS.find((l) => l.level === level);
  if (!row) return `L${level}`;
  if (lang === "ko") {
    return `L${level} ${row.nameKo} (${row.nameEn})`;
  }
  return `L${level} ${row.nameEn} (${row.nameKo})`;
}

/** Badge uses same bilingual-aware format. */
export function levelBadge(level: number, lang: "en" | "ko" = "ko"): string {
  return levelLabel(level, lang);
}

/** Tip follows UI language, secondary language after slash. */
export function levelTip(level: number, lang: "en" | "ko" = "ko"): string {
  const row = WORKFLOW_LEVELS.find((l) => l.level === level);
  if (!row) return "";
  return lang === "ko" ? `${row.tipKo} / ${row.tipEn}` : `${row.tipEn} / ${row.tipKo}`;
}

/** Option line for selects. */
export function levelOptionLabel(
  level: number,
  lang: "en" | "ko" = "ko",
  extra?: string,
): string {
  const base = levelLabel(level, lang);
  return extra ? `${base}${extra}` : base;
}
