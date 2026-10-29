"use client";

import type { ReactNode } from "react";
import { useWt } from "@/providers/context";

/**
 * 모달·사이드바가 열려 있는 동안 뒤쪽 화면(헤더·본문)을 키보드와 스크린 리더가 건드리지 못하게 한다.
 * `contents` 라서 레이아웃에는 영향이 없다.
 */
export function InertWhenOverlay({ children }: { children: ReactNode }) {
  const wt = useWt();
  return (
    <div className="contents" inert={wt.side || wt.modal !== null}>
      {children}
    </div>
  );
}
