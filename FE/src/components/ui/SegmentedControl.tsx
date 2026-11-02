"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";

interface SegmentedControlProps<T extends string> {
  value: T;
  /** [값, 라벨, 아이콘(선택)] */
  options: readonly (readonly [T, string, IconName?])[];
  onChange: (v: T) => void;
  label: string;
  /** 아이콘이 있는 좁은 버튼(좌우 여백 10px) */
  compact?: boolean;
}

/**
 * 선택 표시(검정 알약)는 선택이 바뀌면 새 위치로 미끄러진다. 위치는 DOM 에서 직접 재서 옮기고,
 * 위치를 잡기 전(서버 렌더링·첫 페인트)에는 선택된 버튼 자체가 배경을 가진다.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  compact,
}: SegmentedControlProps<T>) {
  const wrap = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const place = useCallback((animate: boolean) => {
    const w = wrap.current;
    const p = pill.current;
    const b = w?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!w || !p || !b) return;
    p.style.transition = animate ? "" : "none";
    p.style.width = `${b.offsetWidth}px`;
    p.style.transform = `translateX(${b.offsetLeft}px)`;
    w.dataset.ready = "";
    if (!animate) void p.offsetWidth;
  }, []);
  // 선택이 바뀌면 미끄러지고, 첫 위치 잡기는 애니메이션 없이 한다
  useLayoutEffect(() => {
    place(placed.current);
    placed.current = true;
  }, [value, place]);
  // 크기가 바뀔 때(글꼴 로딩 등)는 애니메이션 없이 따라간다. 관찰을 시작할 때 한 번 불리는 것은 건너뛴다
  useEffect(() => {
    const w = wrap.current;
    if (!w) return;
    let size = w.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (w.offsetWidth === size) return;
      size = w.offsetWidth;
      place(false);
    });
    ro.observe(w);
    return () => ro.disconnect();
  }, [place]);
  return (
    <div
      ref={wrap}
      className="relative inline-flex gap-0.5 rounded-pill border border-border bg-card p-[3px] [&:not([data-ready])_[aria-pressed=true]]:bg-ink"
      role="group"
      aria-label={label}
    >
      <span
        ref={pill}
        aria-hidden="true"
        className="absolute top-[3px] bottom-[3px] left-0 rounded-pill bg-ink transition-[transform,width] duration-[280ms] ease-[cubic-bezier(0.34,1.4,0.64,1)]"
        style={{ width: 0 }}
      />
      {options.map(([v, text, icon]) => (
        <button
          key={v}
          type="button"
          className={cx(
            "relative inline-flex h-ctl-sm items-center gap-1.5 rounded-pill text-13 font-semibold transition-colors duration-200",
            compact ? "px-2.5" : "px-3.5",
            value === v ? "text-white" : "text-muted",
          )}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
        >
          {icon && <Icon name={icon} size={15} />}
          {text}
        </button>
      ))}
    </div>
  );
}
