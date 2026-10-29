import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

/** 아이콘만 있는 40px 버튼. 스크린 리더용 `aria-label` 을 꼭 넘긴다 */
export function IconButton({
  shape = "round",
  className,
  ...rest
}: {
  /** square: 테두리가 있는 둥근 사각형(오픈소스 진입 버튼 등) */
  shape?: "round" | "square";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "inline-grid size-ctl-icon shrink-0 place-items-center text-ink disabled:cursor-not-allowed disabled:opacity-40",
        shape === "round"
          ? "rounded-full border-0 bg-transparent hover:bg-ink/6"
          : "rounded-md border border-border bg-card",
        className,
      )}
      {...rest}
    />
  );
}
