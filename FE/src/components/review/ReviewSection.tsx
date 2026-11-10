"use client";

import { useCallback, useState } from "react";
import { realAuth } from "@/api/auth/config";
import type { ReviewSort } from "@/api/real/interactionApi";
import { CursorListControls } from "@/components/ui/CursorListControls";
import { useCursorList } from "@/lib/useCursorList";
import type { Grade, Service } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { boxClass } from "@/components/ui/box";
import { helpClass, labelClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/Icon";
import { Note } from "@/components/ui/Note";
import { GRADE_LABEL } from "@/domain/review";
import { POLICY } from "@/domain/policy";
import { cx } from "@/lib/cx";
import { useTween } from "@/lib/useTween";
import { isMaker } from "@/domain/maker";
import { useWt } from "@/providers/context";
import { RatingVote } from "./RatingVote";
import { ReviewListSkeleton } from "./ReviewListSkeleton";
import { RatioBar } from "./RatioBar";
import { ReviewForm } from "./ReviewForm";
import { ReviewItem } from "./ReviewItem";

/** 평가 문구 색: 긍정은 파랑, 애매하면 노랑, 부정은 빨강 */
const GRADE_TEXT: Record<Grade, string> = {
  vpos: "text-navy",
  pos: "text-navy",
  mpos: "text-navy",
  mixed: "text-butter-ink",
  mneg: "text-wine",
  neg: "text-wine",
  vneg: "text-wine",
  few: "text-ink",
};

const linkClass = "font-bold text-navy underline underline-offset-[3px]";

/** 서비스 상세의 리뷰 탭: 평가 요약, 작성 폼(권한별), 리뷰 목록 */
export function ReviewSection({
  s,
  loading = false,
}: {
  s: Service;
  /** 리뷰 목록을 불러오는 중이면 자리 표시를 보인다(API 연동 때 연결) */
  loading?: boolean;
}) {
  const wt = useWt();
  const agg = wt.agg(s);
  const ratioShown = useTween(agg.ratio ?? 0, 650);
  const upShown = useTween(agg.up, 600);
  const downShown = useTween(agg.down, 600);
  const noneShown = useTween(agg.none, 600);
  const [sort, setSort] = useState<ReviewSort>("RECOMMENDED");
  const loadReviews = wt.loadReviews;
  const load = useCallback(
    (cursor?: string) => loadReviews(s.id, sort, cursor),
    [loadReviews, s.id, sort],
  );
  const page = useCursorList(
    `${s.id}:${sort}:${wt.me?.id ?? "guest"}`,
    wt.reviewRevision(s.id),
    realAuth && wt.sessionReady,
    load,
  );
  const byId = new Map(
    wt.reviews.filter((r) => r.sid === s.id).map((r) => [r.id, r]),
  );
  const list = realAuth
    ? page.ids.flatMap((id) => byId.get(id) ?? [])
    : [...byId.values()];
  const isOwner = isMaker(s, wt.me?.id);
  const myReview = realAuth
    ? wt.myReview(s.id)
    : wt.me && list.find((r) => r.a.uid === wt.me!.id && r.a.kind !== "guest");
  const guestDone = !wt.me && wt.guestReviewed.has(s.id);
  const formBox = `${boxClass} my-6 flex flex-col gap-3 p-6`;
  let form;
  if (realAuth && (!wt.sessionReady || !wt.myReviewReady(s.id))) form = null;
  else if (myReview)
    form = (
      <Note tone="navy" className="my-5">
        <Icon name="check" size={16} />이 서비스에 리뷰를 남겼어요. 리뷰는
        서비스당 1개예요.
        {realAuth && !list.some((r) => r.id === myReview.id) && (
          <span className="flex gap-2">
            {myReview.permissions?.canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  wt.setModal({ type: "review", sid: s.id, review: myReview })
                }
              >
                내 리뷰 수정
              </Button>
            )}
            {myReview.permissions?.canDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  wt.setModal({ type: "delete-review", rid: myReview.id })
                }
              >
                내 리뷰 삭제
              </Button>
            )}
          </span>
        )}
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
          syncRate={wt.myVote(s.id)}
          onRate={
            realAuth
              ? undefined
              : (r) => wt.setVote(s.id, r === "none" ? null : r)
          }
          onSubmit={(v) => wt.addReview(s, isOwner ? "maker" : "member", v)}
        />
      </div>
    );
  else if (s.allowGuest && !guestDone)
    form = (
      <div className={formBox} data-component="review-form" data-role="guest">
        <div className={labelClass}>비회원으로 리뷰 남기기</div>
        <p className={helpClass}>
          이 서비스는 비회원 리뷰를 허용해요. 같은 IP에서 서비스당 1개, 작성 후
          수정할 수 없어요. 추천·비추천은{" "}
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
      <div className="grid grid-cols-[240px_minmax(0,300px)_1fr] items-center gap-8 border-b border-border py-6 @max-[860px]/app:grid-cols-1 @max-[860px]/app:gap-4">
        <div className="flex flex-col gap-2">
          <span className={helpClass}>평가</span>
          <span
            key={agg.grade}
            className={cx(
              "animate-fade text-28 font-extrabold tracking-[-0.02em] transition-colors duration-300",
              GRADE_TEXT[agg.grade],
            )}
          >
            {GRADE_LABEL[agg.grade]}
          </span>
          <span className={helpClass}>
            추천+비추천 {agg.n}개 기준
            {agg.grade === "few" &&
              ` · ${POLICY.reviewMinForGrade}개부터 등급 표시`}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-13">
            <b>
              추천 비율 {agg.ratio == null ? "–" : `${Math.round(ratioShown)}%`}
            </b>
          </div>
          <RatioBar up={agg.up} down={agg.down} />
          <div className="flex flex-wrap gap-4 text-13 text-text-3 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1">
            <span>
              <Icon name="thumbUp" size={14} />
              추천 {Math.round(upShown)}
            </span>
            <span>
              <Icon name="thumbDown" size={14} />
              비추천 {Math.round(downShown)}
            </span>
            <span>
              <Icon name="minus" size={14} />
              미설정 {Math.round(noneShown)}
            </span>
          </div>
          <span className={helpClass}>
            미설정·제작자 리뷰는 등급 산정에서 제외
          </span>
        </div>
        <RatingVote s={s} />
      </div>
      {form}
      {realAuth && (
        <div className="flex justify-end">
          <label className="text-14 text-text-2">
            리뷰 정렬{" "}
            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value === "LATEST" ? "LATEST" : "RECOMMENDED",
                )
              }
            >
              <option value="RECOMMENDED">추천순</option>
              <option value="LATEST">최신순</option>
            </select>
          </label>
        </div>
      )}
      {loading ||
      (realAuth && (!wt.sessionReady || page.loading) && !list.length) ? (
        <ReviewListSkeleton />
      ) : list.length || (!realAuth && agg.total) ? (
        <>
          <div className={`${helpClass} py-2`}>
            {realAuth
              ? `리뷰 ${list.length}개를 표시하고 있어요.`
              : `전체 리뷰 ${agg.total}개 중 최근 ${list.length}개를 표시하고 있어요.`}
          </div>
          <div>
            {list.map((r) => (
              <ReviewItem key={r.id} r={r} s={s} />
            ))}
          </div>
        </>
      ) : !page.error ? (
        <p className="m-0 py-10 text-center text-14 text-muted">
          아직 리뷰가 없어요. 첫 리뷰를 남겨 보세요.
        </p>
      ) : null}
      {realAuth && (
        <CursorListControls
          label="리뷰 더 보기"
          error={page.error}
          hasMore={page.hasMore}
          pending={page.loading || page.morePending}
          loadMore={page.loadMore}
          retry={page.retry}
        />
      )}
    </div>
  );
}
