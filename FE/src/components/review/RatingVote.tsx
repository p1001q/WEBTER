"use client";

import type { Service } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { isMaker } from "@/domain/maker";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";

export function useServiceRating(s: Service) {
  const wt = useWt();
  const current = wt.myVote(s.id);
  const status = wt.me ? wt.myReviewStatus(s.id) : "ready";
  const disabledReason = isMaker(s, wt.me?.id)
    ? "내 서비스는 평가할 수 없어요"
    : s.use === "stop"
      ? "운영 중지된 서비스는 평가할 수 없어요"
      : status === "loading"
        ? "내 평가를 불러오고 있어요"
        : status === "error"
          ? "내 평가를 불러오지 못했어요"
          : status === "idle"
            ? "내 평가를 확인한 뒤 평가할 수 있어요"
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

export function RetryMyReview({ sid }: { sid: string }) {
  const { loadMyReview } = useWt();
  return (
    <div className="flex flex-wrap items-center gap-2 text-13 text-muted">
      <span role="status">내 평가를 불러오지 못했어요.</span>
      <Button size="sm" variant="ghost" onClick={() => void loadMyReview(sid)}>
        다시 시도
      </Button>
    </div>
  );
}

/** 상세 상단 추천과 같은 서비스 평가를 사용한다. 두 위치 어디에서 바꿔도 상태가 함께 갱신된다. */
export function RatingVote({ s }: { s: Service }) {
  const rating = useServiceRating(s);
  return (
    <div
      className="flex justify-self-end gap-2 @max-[860px]/app:justify-self-start"
      data-component="rating-vote"
    >
      {(
        [
          ["up", "추천", "thumbUp"],
          ["down", "비추천", "thumbDown"],
        ] as const
      ).map(([rate, label, icon]) => (
        <button
          key={rate}
          type="button"
          aria-pressed={rating.current === rate}
          aria-label={label}
          title={rating.disabledReason ?? label}
          disabled={!!rating.disabledReason}
          onClick={() => rating.select(rate)}
          className={cx(
            "grid size-11 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-35",
            rating.current === rate
              ? rate === "up"
                ? "bg-navy-50 text-navy"
                : "bg-wine-50 text-wine"
              : "text-muted hover:text-ink",
          )}
        >
          <Icon name={icon} size={24} />
        </button>
      ))}
    </div>
  );
}
