import { cx } from "@/lib/cx";

/** 불러오는 동안 보여 주는 자리 표시 블록. 은은하게 흐르는 빛이 지나간다 */
export const shimmer =
  "animate-skeleton bg-[linear-gradient(90deg,#efede7_0%,#f7f5ef_50%,#efede7_100%)] bg-[length:200%_100%]";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx(shimmer, "rounded-sm", className)} aria-hidden="true" />
  );
}
