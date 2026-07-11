"use client";

// Open-source NOTICE page — Phase B4 (docs/brand/NOTICE-template.md)

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useI18n } from "@/lib/i18n";

const NOTICE_LINES = [
  "Procivio",
  "Copyright (c) 2026 Procivio contributors",
  "",
  "This product includes third-party software.",
  "이 제품은 제3자 오픈소스 소프트웨어를 포함합니다.",
  "",
  "Selected components / 주요 구성:",
  "  @xyflow/react (React Flow) — MIT",
  "  Next.js — MIT",
  "  FastAPI — MIT",
  "  SQLAlchemy — MIT",
  "  html-to-image — MIT",
  "  jspdf — MIT",
  "  ldap3 — LGPLv3 (LDAP client; see package terms)",
  "  dompurify — MPL-2.0 OR Apache-2.0 (prefer Apache-2.0)",
  "",
  "Full inventory / 전체 목록: docs/brand/license-inventory.md",
  "",
  "No Fair-code / n8n core is included.",
  "Fair-code 및 n8n 코어는 포함하지 않습니다.",
];

export default function LegalPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-sm border border-hairline px-2 py-1 text-caption text-ink hover:bg-surface-alt"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          {t("legal.back")}
        </Link>
        <div>
          <h1 className="text-title text-ink">{t("legal.title")}</h1>
          <p className="text-caption text-ink-secondary">{t("legal.subtitle")}</p>
        </div>
      </div>

      <pre
        data-id="legal-notice"
        className="overflow-x-auto whitespace-pre-wrap rounded-md border border-hairline bg-surface p-4 font-mono text-caption leading-relaxed text-ink"
      >
        {NOTICE_LINES.join("\n")}
      </pre>

      <p className="text-fine text-ink-tertiary">
        See also repository files{" "}
        <code className="rounded-sm bg-surface-alt px-1">docs/brand/NOTICE-template.md</code> and{" "}
        <code className="rounded-sm bg-surface-alt px-1">docs/brand/license-inventory.md</code>.
      </p>
    </div>
  );
}
