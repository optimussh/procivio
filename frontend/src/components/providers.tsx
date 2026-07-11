"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { getMe, setDevUser } from "@/lib/api";
import { consumeReturnTo, saveReturnTo } from "@/lib/auth-return";
import { setCurrentUser } from "@/lib/current-user";
import { getStoredDevUser } from "@/lib/dev-auth";

const subscribe = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

// 로그인 후 /api/me로 표시 프로필 + role 발행
async function publishMe(): Promise<void> {
  try {
    const me = await getMe();
    setCurrentUser({
      name: me.name || me.username,
      email: null,
      loginId: me.username,
      role: me.role,
      department: me.department,
      orgPath: me.org_path,
      isSysadmin: me.is_sysadmin,
      managerIds: me.manager_ids ?? [],
    });
  } catch {
    setCurrentUser(null);
  }
}

/** 로컬 로그인 피커(X-Dev-User) 게이트 — OIDC/Keycloak 없음. */
function DevGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const stored = getStoredDevUser();

  // 렌더 단계에서 동기 반영 — 자식 fetch effect가 헤더 없이 나가는 레이스 방지
  setDevUser(stored);

  useEffect(() => {
    if (stored) {
      void publishMe();
    } else {
      setCurrentUser(null);
      if (pathname !== "/login") {
        saveReturnTo(pathname + window.location.search);
        router.replace("/login");
      }
    }
  }, [stored, pathname, router]);

  // 로그인 성공 후 딥링크 복원
  useEffect(() => {
    if (!stored || pathname === "/login") return;
    const returnTo = consumeReturnTo();
    if (returnTo && returnTo !== pathname) {
      router.replace(returnTo);
    }
  }, [stored, pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }
  if (!stored) {
    return null;
  }
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  if (!mounted) {
    return null;
  }
  return <DevGate>{children}</DevGate>;
}
