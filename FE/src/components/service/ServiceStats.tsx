import { Icon } from "@/components/ui/Icon";
import { fmt } from "@/domain/format";
import { cx } from "@/lib/cx";

const stat = "inline-flex items-center gap-1 text-[12.5px] tabular-nums";

/** 추천·저장 수 */
export function ServiceStats({
  s,
  recommendations,
  saved,
  className,
}: {
  s: { saves: number };
  recommendations: number;
  saved?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx("inline-flex items-center gap-3", className)}
      aria-label="반응 수"
    >
      <span className={cx(stat, "font-medium text-text-3")} title="추천">
        <Icon name="thumbUp" size={14} stroke={1.9} />
        <span className="sr-only">추천</span>
        {fmt(recommendations)}
      </span>
      <span
        className={cx(
          stat,
          saved ? "font-bold text-save" : "font-medium text-text-3",
        )}
        title="저장"
      >
        <Icon
          name="bookmark"
          size={14}
          fill={saved}
          stroke={1.9}
          className="text-save"
        />
        <span className="sr-only">저장</span>
        {fmt(s.saves)}
      </span>
    </div>
  );
}
