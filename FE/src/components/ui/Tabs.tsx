"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { cx } from "@/lib/cx";

interface TabsProps<T extends string> {
  value: T;
  /** [값, 라벨, 개수(선택)] */
  items: readonly (readonly [T, string, number?])[];
  onChange: (v: T) => void;
}

/**
 * 선택된 탭 아래 밑줄은 탭이 바뀌면 새 위치로 미끄러진다. 위치는 DOM 에서 직접 재고,
 * 위치를 잡기 전(서버 렌더링·첫 페인트)에는 선택된 탭 자체가 밑줄을 가진다.
 */
export function Tabs<T extends string>({
  value,
  items,
  onChange,
}: TabsProps<T>) {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const place = useCallback((animate: boolean) => {
    const r = root.current;
    const b = bar.current;
    const t = r?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!r || !b || !t) return;
    b.style.transition = animate ? "" : "none";
    b.style.width = `${t.offsetWidth}px`;
    b.style.transform = `translateX(${t.offsetLeft}px)`;
    r.dataset.ready = "";
    if (!animate) void b.offsetWidth;
  }, []);
  // 선택이 바뀌거나, 탭의 숫자가 바뀌어 탭 너비가 달라져도 밑줄을 다시 맞춘다
  const layoutKey = items.map(([, , count]) => count ?? "").join("|");
  useLayoutEffect(() => {
    place(placed.current);
    placed.current = true;
  }, [value, layoutKey, place]);
  useEffect(() => {
    const r = root.current;
    if (!r) return;
    let size = r.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (r.offsetWidth === size) return;
      size = r.offsetWidth;
      place(false);
    });
    ro.observe(r);
    return () => ro.disconnect();
  }, [place]);
  return (
    <div className="border-b border-border">
      <div
        ref={root}
        className="group/tabs relative -mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {items.map(([v, label, count]) => {
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={on}
              className={cx(
                "relative inline-flex h-12 items-center gap-1.5 px-4 text-15 whitespace-nowrap transition-colors duration-200 hover:text-ink",
                on ? "font-bold text-ink" : "font-semibold text-muted",
              )}
              onClick={() => onChange(v)}
            >
              {label}
              {count != null && (
                <small className="font-mono text-11 font-medium text-muted">
                  {count}
                </small>
              )}
              {on && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink group-data-[ready]/tabs:hidden" />
              )}
            </button>
          );
        })}
        <span
          ref={bar}
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-0.5 bg-ink transition-[transform,width] duration-[320ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ width: 0 }}
        />
      </div>
    </div>
  );
}
