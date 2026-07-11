"use client";

import { LogIn, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DevLoginModal } from "@/components/dev-login-modal";
import { setDevUser } from "@/lib/api";
import { consumeReturnTo } from "@/lib/auth-return";
import { storeDevUser } from "@/lib/dev-auth";
import { useI18n } from "@/lib/i18n";

/** 로그인 — 직원 디렉터리/시드 유저 피커만 (OIDC/Keycloak 없음). */
export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [picking, setPicking] = useState(false);

  const onPickDev = (loginId: string) => {
    storeDevUser(loginId);
    setDevUser(loginId);
    setPicking(false);
    router.replace(consumeReturnTo() ?? "/");
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-surface-alt">
      <div className="flex flex-col items-center">
        <div data-id="login-card" className="w-80 rounded-lg border border-hairline bg-surface p-8 shadow-md">
          <div
            data-id="login-brand"
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent-tint"
          >
            <Workflow size={28} strokeWidth={1.5} className="text-accent" />
          </div>
          <p className="mb-1 text-center text-body-strong tracking-tight text-ink">{t("login.title")}</p>
          <p className="mb-6 text-center text-caption text-ink-muted">{t("login.subtitle")}</p>

          <button
            type="button"
            data-id="login-dev"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent text-caption font-semibold text-on-accent hover:bg-accent-focus"
            onClick={() => setPicking(true)}
          >
            <LogIn size={16} strokeWidth={1.5} />
            {t("login.dev")}
          </button>
        </div>
        <p className="mt-4 text-fine text-ink-muted">{t("login.terms")}</p>
      </div>
      {picking && <DevLoginModal onPick={onPickDev} onClose={() => setPicking(false)} />}
    </div>
  );
}
