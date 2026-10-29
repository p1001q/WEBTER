import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

interface ChipStyle {
  /** 선택된 상태 */
  on?: boolean;
  /** sm: 필터 패널 안의 작은 크기(30px) */
  size?: "md" | "sm";
}

/** 칩 모양의 클래스. 눌러서 바꾸지 않는 표시용은 `<span className={chipClass(...)}>` 로 쓴다 */
export function chipClass({ on, size = "md" }: ChipStyle = {}) {
  return cx(
    "inline-flex items-center gap-1 rounded-pill border text-13 font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45",
    size === "sm" ? "h-ctl-sm px-3" : "h-8 px-3.5",
    on
      ? "border-navy bg-navy text-white"
      : "border-border bg-card text-ink hover:border-border-strong",
  );
}

/** 선택·해제하는 칩 버튼 */
export function Chip({
  on,
  size,
  className,
  ...rest
}: ChipStyle & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cx(chipClass({ on, size }), className)}
      {...rest}
    />
  );
}
