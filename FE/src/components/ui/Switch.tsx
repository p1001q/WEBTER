"use client";

import { cx } from "@/lib/cx";

interface SwitchProps {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  desc?: string;
}

export function Switch({ on, onChange, label, disabled, desc }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!on}
      className="inline-flex items-center gap-2.5 text-left text-14 text-ink disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={() => onChange(!on)}
    >
      <span
        className={cx(
          "inline-flex h-[22px] w-9 shrink-0 items-center rounded-[11px] p-0.5 transition-[background] duration-200",
          on ? "justify-end bg-navy" : "bg-[#d5d2ca]",
        )}
      >
        <span className="block size-[18px] rounded-full border border-black/8 bg-white transition-[background] duration-200" />
      </span>
      <span>
        <span className="font-semibold">{label}</span>
        {desc && <span className="block text-[12.5px] text-muted">{desc}</span>}
      </span>
    </button>
  );
}
