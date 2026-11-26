"use client";

import { useState } from "react";
import type { Service } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { fmt } from "@/domain/format";
import { isMaker } from "@/domain/maker";
import { skipUnsaveConfirm } from "@/domain/unsave";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";

const button =
  "inline-flex items-center gap-1 rounded-pill px-1.5 py-1 text-[12.5px] tabular-nums transition-colors hover:bg-light disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent";

/**
 * 카드·목록 항목의 추천·저장 버튼(수와 내 상태를 함께 보여 준다).
 * 추천은 상세의 추천과 같은 서비스 평가다. 리뷰를 쓴 서비스는 리뷰 수정 확인을 거친다.
 * confirmUnsave는 저장한 서비스 목록처럼 해제하면 항목이 사라지는 화면에서만 켠다.
 */
export function ServiceReactions({
  s,
  confirmUnsave,
  className,
}: {
  s: Service;
  confirmUnsave?: boolean;
  className?: string;
}) {
  const wt = useWt();
  const [busy, setBusy] = useState(false);
  const agg = wt.agg(s);
  const maker = isMaker(s, wt.me?.id);
  const saved = wt.saves.has(s.id);
  const vote = wt.me ? wt.myVote(s.id) : null;
  const rateBlocked = maker
    ? "내 서비스는 평가할 수 없어요"
    : s.use === "stop"
      ? "운영 중지된 서비스는 평가할 수 없어요"
      : undefined;
  const saveBlocked = maker ? "내 서비스는 저장할 수 없어요" : undefined;

  const recommend = () => {
    if (rateBlocked || busy) return;
    wt.requireLogin(() => {
      void (async () => {
        setBusy(true);
        try {
          const mine = await wt.ensureMyReview(s.id);
          if (mine === undefined) return;
          const current =
            mine?.rate === "up" || mine?.rate === "down"
              ? mine.rate
              : mine
                ? null
                : wt.myVote(s.id);
          if (mine?.text) {
            wt.setModal({
              type: "confirm-review-edit",
              sid: s.id,
              review: mine,
              rate: current === "up" ? "none" : "up",
            });
            return;
          }
          wt.setVote(s.id, current === "up" ? null : "up");
        } finally {
          setBusy(false);
        }
      })();
    }, "서비스를 평가하려면 로그인이 필요해요.");
  };

  const save = () => {
    if (saveBlocked) return;
    wt.requireLogin(() => {
      if (saved && confirmUnsave && !skipUnsaveConfirm())
        wt.setModal({ type: "unsave", sid: s.id });
      else void wt.toggleSave(s.id);
    }, "저장은 로그인한 회원만 할 수 있어요.");
  };

  return (
    <div
      className={cx("inline-flex items-center gap-1", className)}
      aria-label="반응"
    >
      <button
        type="button"
        className={cx(
          button,
          vote === "up" ? "font-bold text-navy" : "font-medium text-text-3",
        )}
        aria-pressed={vote === "up"}
        aria-label={`추천 ${fmt(agg.up)}`}
        title={rateBlocked ?? (vote === "up" ? "추천 취소" : "추천")}
        disabled={!!rateBlocked || busy}
        onClick={recommend}
      >
        <Icon name="thumbUp" size={14} stroke={1.9} fill={vote === "up"} />
        {fmt(agg.up)}
      </button>
      <button
        type="button"
        className={cx(
          button,
          saved ? "font-bold text-save" : "font-medium text-text-3",
        )}
        aria-pressed={saved}
        aria-label={`저장 ${fmt(s.saves)}`}
        title={saveBlocked ?? (saved ? "저장 해제" : "저장")}
        disabled={!!saveBlocked}
        onClick={save}
      >
        <Icon
          name="bookmark"
          size={14}
          fill={saved}
          stroke={1.9}
          className="text-save"
        />
        {fmt(s.saves)}
      </button>
    </div>
  );
}
