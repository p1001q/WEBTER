"use client";

import { useEffect, useRef, useState } from "react";

/** 숫자가 바뀌면 이전 값에서 새 값으로 부드럽게 올라가거나 내려간다(모션 줄이기 설정에서는 바로 바뀐다) */
export function useTween(value: number, ms = 450) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (
      start === value ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      from.current = value;
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = start + (value - start) * eased;
      from.current = cur;
      setShown(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}
