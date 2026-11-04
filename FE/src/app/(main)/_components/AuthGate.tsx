"use client";

import type { ReactNode } from "react";
import { LoginGate } from "@/components/layout/Restricted";
import { useWt } from "@/providers/context";

/** 로그인해야 볼 수 있는 화면을 감싼다. 비회원에게는 로그인 안내를 보여 준다 */
export function AuthGate({ children }: { children: ReactNode }) {
  const wt = useWt();
  // 서버 세션 확인 전에는 로그인 상태를 알 수 없으므로 안내를 띄우지 않고 기다린다
  if (!wt.sessionReady) return null;
  return wt.me ? children : <LoginGate />;
}
