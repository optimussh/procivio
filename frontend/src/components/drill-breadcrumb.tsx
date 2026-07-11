"use client";

// 드릴인 경로 breadcrumb — 큰 판 → 하위프로세스 스코프 체인 표시·클릭 복귀.

import { ChevronRight, Layers } from "lucide-react";

import { useI18n } from "@/lib/i18n";

export interface DrillCrumb {
  title: string;
  /** 이 깊이까지 유지 (slice end exclusive index for navigateTo) */
  depth: number;
}

export function DrillBreadcrumb({
  crumbs,
  onNavigate,
}: {
  crumbs: DrillCrumb[];
  onNavigate: (depth: number) => void;
}) {
  const { t } = useI18n();
  if (crumbs.length <= 1) return null;

  return (
    <nav
      data-id="drill-breadcrumb"
      aria-label={t("subprocess.breadcrumbLabel")}
      className="flex min-w-0 flex-wrap items-center gap-0.5 rounded-full border border-hairline bg-surface-alt/90 px-2.5 py-1 text-fine shadow-sm backdrop-blur-sm"
    >
      <Layers size={12} strokeWidth={1.5} className="shrink-0 text-accent" aria-hidden />
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${c.depth}-${c.title}`} className="inline-flex min-w-0 items-center gap-0.5">
            {i > 0 && (
              <ChevronRight size={12} strokeWidth={1.5} className="shrink-0 text-ink-muted" />
            )}
            {last ? (
              <span className="truncate font-semibold text-accent" title={c.title}>
                {c.title}
              </span>
            ) : (
              <button
                type="button"
                className="max-w-[10rem] truncate rounded-full px-1.5 py-0.5 text-ink-secondary hover:bg-surface hover:text-accent"
                title={c.title}
                onClick={() => onNavigate(c.depth)}
              >
                {c.title}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
