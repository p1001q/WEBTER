"use client";

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

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  compact,
}: SegmentedControlProps<T>) {
  return (
    <div
      className="inline-flex gap-0.5 rounded-pill border border-border bg-card p-[3px]"
      role="group"
      aria-label={label}
    >
      {options.map(([v, text, icon]) => (
        <button
          key={v}
          type="button"
          className={cx(
            "inline-flex h-ctl-sm items-center gap-1.5 rounded-pill text-13 font-semibold",
            compact ? "px-2.5" : "px-3.5",
            value === v ? "bg-ink text-white" : "text-muted",
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
