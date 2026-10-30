"use client";

import type { Service } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { boxClass } from "@/components/ui/box";
import { helpClass, labelClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/Icon";
import { Note } from "@/components/ui/Note";
import { GRADE_LABEL, ratioText } from "@/domain/review";
import { POLICY } from "@/domain/policy";
import { useWt } from "@/providers/context";
import { RatioBar } from "./RatioBar";
import { ReviewForm } from "./ReviewForm";
import { ReviewItem } from "./ReviewItem";

const linkClass = "font-bold text-navy underline underline-offset-[3px]";

/** 서비스 상세의 리뷰 탭: 평가 요약, 작성 폼(권한별), 리뷰 목록 */
export function ReviewSection({ s }: { s: Service }) {
  const wt = useWt();
  const agg = wt.agg(s);
  const list = wt.reviews.filter((r) => r.sid === s.id);
  const isOwner = !!wt.me && s.owner === wt.me.id;
  const myReview =
    wt.me && list.find((r) => r.a.uid === wt.me!.id && r.a.kind !== "guest");
  const guestDone = !wt.me && wt.guestReviewed.has(s.id);
  const formBox = `${boxClass} my-6 flex flex-col gap-3 p-6`;
  let form;
  if (myReview)
    form = (
      <Note tone="navy" className="my-5">
        <Icon name="check" size={16} />이 서비스에 리뷰를 남겼어요. 리뷰는
        서비스당 1개이며 아래에서 수정·삭제할 수 있어요.
      </Note>
    );
  else if (wt.me)
    form = (
      <div
        className={formBox}
        data-component="review-form"
        data-role={isOwner ? "maker" : "member"}
      >
        <div className={labelClass}>
          {isOwner ? "제작자 리뷰 남기기" : "리뷰 남기기"}
        </div>
        <ReviewForm
          s={s}
          role={isOwner ? "maker" : "member"}
          onSubmit={(v) => wt.addReview(s, isOwner ? "maker" : "member", v)}
        />
      </div>
    );
  else if (s.allowGuest && !guestDone)
    form = (
      <div className={formBox} data-component="review-form" data-role="guest">
        <div className={labelClass}>비회원으로 리뷰 남기기</div>
        <p className={helpClass}>
          이 서비스는 비회원 리뷰를 허용해요. 같은 기기(IP) 기준 서비스당 1개,
          작성 후 수정할 수 없어요. 추천·비추천은{" "}
          <button
            type="button"
            className={linkClass}
            onClick={() => wt.go("login", { back: wt.currentPath() })}
          >
            로그인
          </button>{" "}
          후 남길 수 있어요.
        </p>
        <ReviewForm
          s={s}
          role="guest"
          onSubmit={(v) => wt.addReview(s, "guest", v)}
        />
      </div>
    );
  else if (guestDone)
    form = (
      <Note className="my-5">
        <Icon name="check" size={16} />
        비회원 리뷰를 남겼어요. 비회원 리뷰는 수정할 수 없어요.
      </Note>
    );
  else
    form = (
      <div
        className={`${boxClass} my-6 flex flex-wrap items-center gap-3 px-6 py-4`}
        data-component="review-gate"
      >
        <Icon name="lock" size={18} />
        <p className="m-0 min-w-[200px] flex-1 text-14 text-text-2">
          이 서비스는 회원만 리뷰를 남길 수 있어요. 로그인하고 추천·비추천을
          남겨 주세요.
        </p>
        <Button
          size="sm"
          onClick={() =>
            wt.requireLogin(() => {}, "리뷰를 남기려면 로그인이 필요해요.")
          }
        >
          로그인하고 리뷰 쓰기
        </Button>
      </div>
    );
  return (
    <div data-component="review-section">
      <div className="grid grid-cols-[240px_1fr] items-center gap-8 border-b border-border py-6 @max-[860px]/app:grid-cols-1 @max-[860px]/app:gap-4">
        <div className="flex flex-col gap-2">
          <span className={helpClass}>평가</span>
          <span className="text-28 font-extrabold tracking-[-0.02em]">
            {GRADE_LABEL[agg.grade]}
          </span>
          <span className={helpClass}>
            추천+비추천 {agg.n}개 기준
            {agg.grade === "few" &&
              ` · ${POLICY.reviewMinForGrade}개부터 등급 표시`}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-13">
            <b>추천 비율 {ratioText(agg.ratio)}</b>
            <span className={helpClass}>
              미설정·제작자 리뷰는 집계에서 제외
            </span>
          </div>
          <RatioBar up={agg.up} down={agg.down} />
          <div className="flex flex-wrap gap-4 text-13 text-text-3 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1">
            <span>
              <Icon name="thumbUp" size={14} />
              추천 {agg.up}
            </span>
            <span>
              <Icon name="thumbDown" size={14} />
              비추천 {agg.down}
            </span>
            <span>
              <Icon name="minus" size={14} />
              미설정 {agg.none}
            </span>
          </div>
        </div>
      </div>
      {form}
      <div className={`${helpClass} py-2`}>
        전체 리뷰 {agg.total}개 중 최근 {list.length}개를 표시하고 있어요.
      </div>
      <div>
        {list.map((r) => (
          <ReviewItem key={r.id} r={r} s={s} />
        ))}
      </div>
    </div>
  );
}
