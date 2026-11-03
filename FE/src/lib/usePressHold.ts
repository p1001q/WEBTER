"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 눌린 상태를 최소 `minMs` 동안 유지한다. 빠르게 클릭해도 눌리는 모션이 끝까지 보이고,
 * 오래 누르고 있으면 뗄 때까지 눌려 있다. 마우스·터치·키보드(Enter·Space) 모두 같다.
 */
export function usePressHold(minMs = 320) {
  const [pressed, setPressed] = useState(false);
  const since = useRef(0);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const down = () => {
    window.clearTimeout(timer.current);
    since.current = performance.now();
    setPressed(true);
  };
  const up = () => {
    const left = minMs - (performance.now() - since.current);
    window.clearTimeout(timer.current);
    if (left <= 0) setPressed(false);
    else timer.current = window.setTimeout(() => setPressed(false), left);
  };
  return {
    pressed,
    bind: {
      onPointerDown: down,
      onPointerUp: up,
      onPointerLeave: up,
      // 누른 채 벗어났다가 다시 들어오면 눌린 상태로 돌아간다
      onPointerEnter: (e: React.PointerEvent) => {
        if (e.buttons) down();
      },
      onPointerCancel: up,
      onKeyDown: (e: React.KeyboardEvent) => {
        if ((e.key === "Enter" || e.key === " ") && !e.repeat) down();
      },
      onKeyUp: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") up();
      },
      onBlur: up,
    },
  };
}
