"use client";

import { useEffect, useRef, type ReactNode } from "react";

const STIFFNESS = 0.05;
const DAMPING = 0.75;
const MAX_LAG = 90;
/** 위로는 sticky 위치(88px)에서 헤더(64px)에 가려지지 않는 만큼만 뒤처진다 */
const MIN_LAG = -24;

/**
 * 스크롤을 따라오는 옆 영역. 위치는 CSS sticky 가 정하고, 여기서는 그 위치를 뒤따르는 스프링 움직임만 더한다.
 * 스크롤이 시작되면 잠깐 뒤처졌다가 스윽 따라붙고, 멈추면 살짝 넘실거리며 자리를 잡는다.
 * 화면 이동이 없을 때(스크롤을 멈춘 뒤)는 애니메이션 루프를 돌리지 않는다.
 */
export function FloatAside({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let t = 0; // 지금 더해 둔 이동량
    let v = 0; // 스프링 속도
    let at: number | null = null; // 보이는 위치(문서 기준)
    let raf = 0;
    const tick = () => {
      // 모션 줄이기 설정이 도중에 켜지면 움직임을 멈추고 원래 자리로 돌린다
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.style.transform = "";
        t = 0;
        v = 0;
        at = null;
        raf = 0;
        return;
      }
      // sticky 가 정한 위치(이동량을 뺀 값)를 문서 기준으로 구한다. 붙지 않은 동안은 스크롤해도 변하지 않는다
      const goal = el.getBoundingClientRect().top - t + window.scrollY;
      if (at === null) at = goal;
      v = (v + (goal - at) * STIFFNESS) * DAMPING;
      at += v;
      t = Math.max(MIN_LAG, Math.min(MAX_LAG, at - goal));
      at = goal + t; // 한도를 넘은 만큼은 쌓아 두지 않는다(멈출 때 크게 튕기지 않게)
      if (Math.abs(t) < 0.15 && Math.abs(v) < 0.15) {
        t = 0;
        v = 0;
        at = goal;
        el.style.transform = "";
        raf = 0;
        return;
      }
      el.style.transform = `translate3d(0, ${t}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
    return () => {
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
