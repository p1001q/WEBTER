import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

/** 작은 글자 버튼(수정·삭제·신고 등). 비활성이면 눌리지 않는 표시로 쓴다 */
export function MiniButton({
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-7 items-center gap-1 rounded-sm px-2 text-12 text-muted hover:bg-light hover:text-ink disabled:cursor-default disabled:bg-transparent disabled:text-placeholder disabled:hover:bg-transparent disabled:hover:text-placeholder",
        className,
      )}
      {...rest}
    />
  );
}
