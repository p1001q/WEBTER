"use client";

import { cx } from "@/lib/cx";

interface TabsProps<T extends string> {
  value: T;
  /** [값, 라벨, 개수(선택)] */
  items: readonly (readonly [T, string, number?])[];
  onChange: (v: T) => void;
}

export function Tabs<T extends string>({
  value,
  items,
  onChange,
}: TabsProps<T>) {
  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              "relative inline-flex h-12 items-center gap-1.5 whitespace-nowrap px-4 text-15 hover:text-ink",
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
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" />
            )}
          </button>
        );
      })}
    </div>
  );
}
