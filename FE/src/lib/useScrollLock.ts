"use client";

import { useEffect } from "react";

let locks = 0;

/** 어둡게 덮는 창(모달·사이드바·이미지 확대)이 떠 있는 동안 뒤쪽 페이지 스크롤을 멈춘다. 여러 창이 겹쳐도 마지막이 닫힐 때 푼다 */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    locks++;
    document.documentElement.style.overflow = "hidden";
    return () => {
      locks--;
      if (locks === 0) document.documentElement.style.overflow = "";
    };
  }, [active]);
}
