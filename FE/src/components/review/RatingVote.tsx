"use client";

import type { Service } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { isMaker } from "@/domain/maker";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";

export function useServiceRating(s: Service) {
  const wt = useWt();
  const current = wt.myVote(s.id);
  const disabledReason = isMaker(s, wt.me?.id)
    ? "내 서비스는 평가할 수 없어요"
    : s.use === "stop"
      ? "운영 중지된 서비스는 평가할 수 없어요"
      : wt.me && !wt.myReviewReady(s.id)
        ? "내 평가를 불러오고 있어요"
        : undefined;
  const select = (rate: "up" | "down") => {
    if (disabledReason) return;
    wt.requireLogin(() => {
      const mine = wt.myReview(s.id);
      if (mine) {
        wt.setModal({
          type: "confirm-review-edit",
          sid: s.id,
          review: mine,
          rate: current === rate ? "none" : rate,
        });
      } else {
        wt.vote(s.id, rate);
      }
    }, "서비스를 평가하려면 로그인이 필요해요.");
  };
  return { current, disabledReason, select };
}

/** 비추천은 리뷰 탭에서 남긴다. 추천은 상세 상단에서 누를 수 있다. */
export function RatingVote({ s }: { s: Service }) {
  const rating = useServiceRating(s);
  const selected = rating.current === "down";
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label="비추천"
      title={rating.disabledReason ?? "비추천"}
      disabled={!!rating.disabledReason}
      onClick={() => rating.select("down")}
      data-component="rating-vote"
      className={cx(
        "flex items-center gap-1.5 justify-self-end rounded-full px-3 py-2 text-13 transition-colors disabled:cursor-not-allowed disabled:opacity-35 @max-[860px]/app:justify-self-start",
        selected
          ? "bg-wine-50 font-bold text-wine"
          : "text-muted hover:text-ink",
      )}
    >
      <Icon name="thumbDown" size={18} />
      비추천
    </button>
  );
}
