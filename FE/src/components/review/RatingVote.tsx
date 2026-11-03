"use client";

import type { Service } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";

/**
 * 의견 없이 추천·비추천만 남기는 버튼. 누르면 집계에 들어가고 아래 리뷰 폼의 평가에도 반영되지만,
 * 리뷰 목록에는 오르지 않는다. 고른 쪽은 진한 색으로 살짝 커지고 고르지 않은 쪽은 뒤로 물러난다.
 */
export function RatingVote({ s }: { s: Service }) {
  const wt = useWt();
  const my = wt.myVote(s.id);
  const reason = !wt.me
    ? "로그인하면 평가할 수 있어요"
    : wt.me.id === s.owner
      ? "내 서비스는 평가할 수 없어요"
      : s.use === "stop"
        ? "운영 중지된 서비스는 평가할 수 없어요"
        : undefined;
  const item = (
    rate: "up" | "down",
    label: string,
    icon: "thumbUp" | "thumbDown",
    on: string,
  ) => {
    const sel = my === rate;
    return (
      <button
        type="button"
        aria-pressed={sel}
        aria-label={label}
        title={reason ?? label}
        disabled={!!reason}
        onClick={() => wt.vote(s.id, rate)}
        className={cx(
          "grid size-12 place-items-center rounded-full transition-[transform,color,opacity] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-35",
          sel
            ? cx("scale-[1.18]", on)
            : my
              ? "scale-[0.88] text-muted opacity-45"
              : "text-muted not-disabled:hover:scale-110 not-disabled:hover:text-ink",
        )}
      >
        <Icon name={icon} size={26} stroke={2} />
      </button>
    );
  };
  return (
    <div
      className="flex items-center gap-2 justify-self-end @max-[860px]/app:justify-self-start"
      role="group"
      aria-label="이 서비스 평가"
      data-component="rating-vote"
    >
      {item("up", "추천", "thumbUp", "text-navy")}
      {item("down", "비추천", "thumbDown", "text-wine")}
    </div>
  );
}
