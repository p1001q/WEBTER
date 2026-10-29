import { Icon } from "@/components/ui/Icon";
import { fmt } from "@/domain/format";
import { cx } from "@/lib/cx";

const stat = "inline-flex items-center gap-1 text-[12.5px] tabular-nums";

/** 좋아요·저장 수. liked/saved 이면 강조한다 */
export function ServiceStats({
  s,
  liked,
  saved,
  className,
}: {
  s: { likes: number; saves: number };
  liked?: boolean;
  saved?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx("inline-flex items-center gap-3", className)}
      aria-label="반응 수"
    >
      <span
        className={cx(
          stat,
          liked ? "font-bold text-like" : "font-medium text-text-3",
        )}
        title="좋아요"
      >
        <Icon
          name="heart"
          size={14}
          fill={liked}
          stroke={1.9}
          className="text-like"
        />
        <span className="sr-only">좋아요</span>
        {fmt(s.likes)}
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
