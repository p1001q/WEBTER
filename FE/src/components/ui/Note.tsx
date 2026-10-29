import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

const TONE = {
  neutral: "border-border bg-card text-text-3",
  navy: "border-navy-50 bg-navy-50 text-navy",
  wine: "border-wine-50 bg-wine-50 text-wine",
  butter: "border-butter-50 bg-butter-50 text-butter-ink",
};

/** 화면 안의 안내 상자 */
export function Note({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof TONE;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-2 rounded-md border px-3.5 py-2.5 text-13",
        TONE[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
