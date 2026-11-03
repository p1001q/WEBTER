"use client";

import { useEffect, useRef } from "react";

const revealed = new Set<string>();

/**
 * 방금 남긴 리뷰·댓글이면 화면 가운데로 부드럽게 스크롤해 보여 준다(강조 표시와 함께).
 * 같은 항목은 한 번만 움직인다. 탭을 오가며 다시 그려져도 다시 스크롤하지 않는다.
 */
export function useRevealWhenFresh(id: string, fresh?: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!fresh || revealed.has(id)) return;
    revealed.add(id);
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    ref.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
  }, [id, fresh]);
  return ref;
}
