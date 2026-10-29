"use client";

import { cx } from "@/lib/cx";

interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  label: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  return (
    <div
      className="inline-flex gap-0.5 rounded-pill border border-border bg-card p-[3px]"
      role="group"
      aria-label={label}
    >
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          className={cx(
            "inline-flex h-ctl-sm items-center gap-1.5 rounded-pill px-3.5 text-13 font-semibold",
            value === v ? "bg-ink text-white" : "text-muted",
          )}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
