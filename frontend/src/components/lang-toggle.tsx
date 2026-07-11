"use client";

// 플랫폼 전역 한/영 전환 — localStorage(bpm.lang) 영속, LangProvider.setLang
import { useI18n } from "@/lib/i18n";

type Props = {
  /** compact: 상단 네비 / roomy: 로그인 카드 등 */
  size?: "compact" | "roomy";
  className?: string;
};

export function LangToggle({ size = "compact", className = "" }: Props) {
  const { lang, setLang, t } = useI18n();
  const pad = size === "roomy" ? "px-3 py-1.5 text-caption" : "px-1.5 py-0.5 text-fine";

  return (
    <div
      role="group"
      aria-label={t("nav.langToggle")}
      data-id="lang-toggle"
      className={
        "inline-flex items-center rounded-sm border border-hairline bg-surface-alt p-0.5 " +
        className
      }
    >
      {(["ko", "en"] as const).map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            data-id={`lang-toggle-${code}`}
            aria-pressed={active}
            // 언어명은 항상 그 언어 표기 — UI 언어와 무관하게 양쪽 선택지 인식
            className={
              `rounded-xs font-medium transition-colors ${pad} ` +
              (active
                ? "bg-surface font-semibold text-accent shadow-sm"
                : "text-ink-tertiary hover:text-ink-secondary")
            }
            onClick={() => setLang(code)}
          >
            {code === "ko" ? "한국어" : "English"}
          </button>
        );
      })}
    </div>
  );
}
