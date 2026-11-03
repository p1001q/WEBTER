"use client";

import { useId } from "react";
import type { UseState } from "@/api/types";
import { Footer } from "@/components/layout/Footer";
import { GradeBadge } from "@/components/review/GradeBadge";
import { ServiceIcon } from "@/components/service/ServiceIcon";
import { StatusBadge } from "@/components/service/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { MiniButton } from "@/components/ui/MiniButton";
import { RouteLink } from "@/components/ui/RouteLink";
import { boxClass } from "@/components/ui/box";
import { helpClass, selectClass } from "@/components/ui/field";
import { fmt, fmtDate } from "@/domain/format";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";
import { ListHead } from "../../_components/ListHead";

const rowGrid =
  "grid grid-cols-[minmax(0,2.2fr)_150px_minmax(0,1.6fr)_188px_104px] items-center gap-4 @max-[1180px]/app:grid-cols-[minmax(0,2fr)_140px_minmax(0,1.4fr)_180px] @max-[860px]/app:grid-cols-[1fr_auto]";
const mobileOnly = "@max-[860px]/app:col-span-full";
const miniAction = "text-13!";

/** 내 서비스 관리: 운영 상태·반응 확인과 수정·삭제 */
export function ManageScreen() {
  const wt = useWt();
  const P = useId();
  const mine = wt.services
    .filter((s) => s.owner === wt.me?.id)
    .sort((a, b) => b.created.localeCompare(a.created));
  const onUse = async (id: string, cur: UseState, v: UseState) => {
    if (v === cur) return;
    if (v === "stop") wt.setModal({ type: "stop", sid: id });
    else if (await wt.updateService(id, { use: "live", stopReason: "" }))
      wt.toast("운영 중으로 바꿨어요.");
  };
  return (
    <>
      <div className="page-wrap">
        <ListHead
          flush
          title="내 서비스 관리"
          desc="내가 등록한 서비스의 운영 상태와 반응을 확인하고 관리해요."
          action={
            <Button className="ml-auto" onClick={() => wt.go("register")}>
              <Icon name="plus" size={16} stroke={2.2} />
              서비스 등록
            </Button>
          }
        />
        {mine.length === 0 ? (
          <div className={`${boxClass} mt-6`}>
            <EmptyState
              title="아직 등록한 서비스가 없어요"
              desc="직접 만든 웹 서비스를 등록하고 반응을 받아 보세요."
              action="첫 서비스 등록하기"
              onAction={() => wt.go("register")}
              icon="plus"
            />
          </div>
        ) : (
          <div
            className="mt-6 overflow-hidden rounded-lg border border-border bg-card @max-[860px]/app:flex @max-[860px]/app:flex-col @max-[860px]/app:gap-3 @max-[860px]/app:border-0 @max-[860px]/app:bg-transparent"
            role="table"
            aria-label="내 서비스 목록"
            data-component="manage-table"
          >
            <div
              className={cx(
                rowGrid,
                "bg-[#fbfaf7] px-5 py-3 text-[12.5px] font-bold text-muted @max-[860px]/app:hidden",
              )}
              role="row"
            >
              <span role="columnheader">서비스</span>
              <span role="columnheader">운영 상태</span>
              <span role="columnheader">통계</span>
              <span role="columnheader" className="text-center">
                동작
              </span>
              <span role="columnheader" className="@max-[1180px]/app:hidden">
                등록일
              </span>
            </div>
            {mine.map((s) => {
              const agg = wt.agg(s);
              const hidden = s.pub !== "public";
              return (
                <div
                  key={s.id}
                  className={cx(
                    rowGrid,
                    "border-t border-light px-5 py-4 first:border-t-0 @max-[860px]/app:rounded-md @max-[860px]/app:border @max-[860px]/app:border-border @max-[860px]/app:bg-card @max-[860px]/app:p-3.5",
                  )}
                  role="row"
                  data-sid={s.id}
                  data-pub={s.pub}
                >
                  <div
                    className={cx(
                      "flex min-w-0 items-center gap-3.5",
                      mobileOnly,
                    )}
                    role="cell"
                  >
                    <ServiceIcon s={s} size={48} />
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5 font-bold">
                        {hidden ? (
                          <span>{s.name}</span>
                        ) : (
                          <RouteLink
                            to="detail"
                            params={{ id: s.id }}
                            className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline"
                          >
                            {s.name}
                          </RouteLink>
                        )}
                        {hidden && (
                          <StatusBadge kind={s.pub as "private" | "temp"} />
                        )}
                      </div>
                      <div className="truncate text-13 text-muted">
                        {s.tagline}
                      </div>
                      {hidden && (
                        <div
                          className={cx(
                            "mt-1 hidden items-start gap-1.5 text-12 @max-[860px]/app:flex",
                            s.pub === "temp" ? "text-butter-ink" : "text-wine",
                          )}
                        >
                          <Icon
                            name="info"
                            size={13}
                            className="mt-px shrink-0"
                          />
                          <span className="min-w-0">{s.pubReason}</span>
                        </div>
                      )}
                      {s.use === "stop" && (
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-12 text-muted">
                          사유: {s.stopReason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div role="cell">
                    <label className="sr-only" htmlFor={P + "use-" + s.id}>
                      {s.name} 운영 상태
                    </label>
                    <select
                      id={P + "use-" + s.id}
                      className={cx(
                        selectClass,
                        "h-[34px]! rounded-[6px]! px-2! text-13! font-semibold",
                        s.use === "live" ? "text-navy!" : "text-muted!",
                      )}
                      value={s.use}
                      onChange={(e) =>
                        onUse(s.id, s.use, e.target.value as UseState)
                      }
                    >
                      <option value="live">운영 중</option>
                      <option value="stop">운영 중지</option>
                    </select>
                  </div>
                  <div
                    className={cx(
                      "flex flex-wrap items-center gap-x-2 gap-y-1.5 text-13 text-text-3 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1",
                      mobileOnly,
                    )}
                    role="cell"
                  >
                    <span title="조회수" className="w-[54px]">
                      <Icon name="eye" size={14} />
                      {fmt(s.views)}
                    </span>
                    <span title="이용하기 클릭" className="w-[54px]">
                      <Icon name="click" size={14} />
                      {fmt(s.clicks)}
                    </span>
                    <span title="좋아요" className="w-[54px]">
                      <Icon name="heart" size={14} />
                      {fmt(s.likes)}
                    </span>
                    <span title="저장" className="w-[54px]">
                      <Icon name="bookmark" size={14} />
                      {fmt(s.saves)}
                    </span>
                    <GradeBadge grade={agg.grade} />
                  </div>
                  <div
                    className={cx(
                      "grid grid-cols-[auto_auto] justify-center gap-x-1 gap-y-0.5 @max-[860px]/app:flex @max-[860px]/app:flex-wrap @max-[860px]/app:justify-start @max-[860px]/app:border-t @max-[860px]/app:border-light @max-[860px]/app:pt-2.5",
                      mobileOnly,
                    )}
                    role="cell"
                  >
                    <MiniButton
                      className={miniAction}
                      onClick={() =>
                        hidden
                          ? wt.toast(
                              "비공개 서비스는 일반 상세 화면에서 보이지 않아요. 리뷰는 공개 상태일 때 확인할 수 있어요.",
                            )
                          : wt.go("detail", { id: s.id, tab: "reviews" })
                      }
                    >
                      <Icon name="reply" size={14} />
                      리뷰 {agg.total}
                    </MiniButton>
                    <MiniButton
                      className={miniAction}
                      onClick={() =>
                        wt.setModal({ type: "versions", sid: s.id })
                      }
                    >
                      <Icon name="history" size={14} />
                      버전
                    </MiniButton>
                    <MiniButton
                      className={cx(miniAction, "text-price-free!")}
                      onClick={() => wt.go("edit", { id: s.id })}
                    >
                      <Icon name="edit" size={14} />
                      수정
                    </MiniButton>
                    <MiniButton
                      className={cx(miniAction, "text-wine!")}
                      onClick={() => wt.setModal({ type: "delete", sid: s.id })}
                    >
                      <Icon name="trash" size={14} />
                      삭제
                    </MiniButton>
                  </div>
                  <div
                    role="cell"
                    className="font-mono text-[12.5px] text-muted @max-[1180px]/app:hidden"
                  >
                    {fmtDate(s.created)}
                  </div>
                  {hidden && (
                    <div
                      className={cx(
                        "col-span-full -mt-2 flex min-w-0 items-center gap-1.5 text-12 @max-[860px]/app:hidden",
                        s.pub === "temp" ? "text-butter-ink" : "text-wine",
                      )}
                      role="cell"
                    >
                      <Icon name="info" size={13} className="shrink-0" />
                      <span className="truncate" title={s.pubReason}>
                        {s.pubReason}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className={cx(helpClass, "mt-4")}>
          비공개·임시 비공개는 운영자가 정하며 직접 바꿀 수 없어요. 이의 제기는
          tndus10@skuniv.ac.kr(임시)로 보내 주세요.
        </p>
      </div>
      <Footer />
    </>
  );
}
