"use client";

import type { ReactNode } from "react";
import { LoginGate } from "@/components/layout/Restricted";
import { useWt } from "@/providers/context";

/** 로그인해야 볼 수 있는 화면을 감싼다. 비회원에게는 로그인 안내를 보여 준다 */
export function AuthGate({ children }: { children: ReactNode }) {
  const wt = useWt();
  return wt.me ? children : <LoginGate />;
}
