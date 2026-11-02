"use client";

import type { Service } from "@/api/types";
import { Footer } from "@/components/layout/Footer";
import { ServiceCard } from "@/components/service/ServiceCard";
import { ServiceIcon } from "@/components/service/ServiceIcon";
import { ServiceList } from "@/components/service/ServiceList";
import { ServiceThumb } from "@/components/service/ServiceThumb";
import { StatusBadge } from "@/components/service/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { MiniButton } from "@/components/ui/MiniButton";
import { RouteLink } from "@/components/ui/RouteLink";
import { Tabs } from "@/components/ui/Tabs";
import { helpClass } from "@/components/ui/field";
import { fmtDate } from "@/domain/format";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";
import type { MyPageTab as Tab } from "../tabs";
import { SettingsPanel } from "./SettingsPanel";

const reviewText =
  "m-0 mt-1.5 text-14 leading-[1.7] whitespace-pre-line text-[#3a3a3a] [overflow-wrap:anywhere]";

/** 비공개·임시 비공개 서비스는 본인에게만 이유와 함께 흐리게 보여 준다 */
function HiddenServiceCard({ s }: { s: Service }) {
  return (
    <article
      className="relative flex min-w-0 flex-col overflow-hidden rounded-sm bg-card shadow-card transition-shadow duration-200 hover:shadow-hover"
      data-private={s.pub}
    >
      <div className="relative block opacity-55">
        <ServiceThumb s={s} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-4 pb-3.5">
        <div className="flex min-w-0 items-center gap-2 text-12 text-muted">
          <StatusBadge kind={s.pub as "private" | "temp"} />
        </div>
        <h3 className="m-0 truncate text-16 leading-[1.35] font-bold tracking-[-0.01em]">
          {s.name}
        </h3>
        <p
          className={cx(
            "m-0 flex items-start gap-1.5 text-[12.5px] leading-[1.45]",
            s.pub === "temp" ? "text-butter-ink" : "text-wine",
          )}
        >
          <Icon name="info" size={14} className="mt-px" />
          {s.pubReason}
        </p>
      </div>
      <div className="flex min-h-11 items-center gap-1 border-t border-light px-4 py-2.5 text-[12.5px]">
        <span className={helpClass}>일반 사용자에게 보이지 않아요</span>
      </div>
    </article>
  );
}

/** 저장했지만 비공개로 바뀐 서비스: 이름과 저장 해제만 보여 준다(이미지·사유는 가린다) */
function SavedHiddenCard({ s }: { s: Service }) {
  const wt = useWt();
  return (
    <article
      className="relative flex min-w-0 flex-col overflow-hidden rounded-sm bg-card shadow-card"
      data-saved-hidden={s.id}
    >
      <div className="aspect-[16/10] bg-light" />
      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-4 pb-3.5">
        <div className="flex min-w-0 items-center gap-2 text-12 text-muted">
          <StatusBadge kind="private" />
        </div>
        <h3 className="m-0 truncate text-16 leading-[1.35] font-bold tracking-[-0.01em] text-muted">
          {s.name}
        </h3>
        <p className="m-0 flex items-start gap-1.5 text-[12.5px] leading-[1.45] text-muted">
          <Icon name="info" size={14} className="mt-px" />
          지금은 볼 수 없는 서비스예요
        </p>
      </div>
      <div className="flex min-h-11 items-center gap-1 border-t border-light px-4 py-2.5 text-[12.5px]">
        <MiniButton onClick={() => wt.toggleSave(s.id)}>
          <Icon name="bookmark" size={13} />
          저장 해제
        </MiniButton>
      </div>
    </article>
  );
}

/** 마이페이지: 내 서비스·저장한 서비스·내가 쓴 리뷰·계정 설정 */
export function MyPageScreen({ tab }: { tab: Tab }) {
  const wt = useWt();
  const me = wt.me!;
  const mine = wt.services.filter((s) => s.owner === me.id);
  const saved = wt.services.filter((s) => wt.saves.has(s.id));
  const myReviews = wt.reviews.filter(
    (r) => r.a.uid === me.id && r.a.kind !== "guest",
  );
  return (
    <>
      <div className="page-wrap">
        <div className="flex flex-wrap items-center gap-6 pt-8 pb-6">
          <Avatar user={me} size={80} />
          <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
            <h1 className="m-0 flex flex-wrap items-baseline gap-2.5 text-28 font-extrabold tracking-[-0.02em]">
              {me.nick}
              <small className="font-mono text-14 font-medium text-muted">
                @{me.handle}
              </small>
            </h1>
            {me.bio && <p className="m-0 text-text-2">{me.bio}</p>}
            <div className="flex flex-wrap gap-5 text-14 text-muted [&_b]:mr-0.5 [&_b]:font-extrabold [&_b]:text-ink">
              <span>
                <b>{mine.length}</b>내 서비스
              </span>
              <span>
                <b>{saved.length}</b>저장
              </span>
              <span>
                <b>{myReviews.length}</b>리뷰
              </span>
            </div>
          </div>
          <RouteLink
            to="profile"
            params={{ id: me.id }}
            className={buttonClass({ variant: "ghost" })}
          >
            내 프로필 보기
          </RouteLink>
        </div>
        <Tabs<Tab>
          value={tab}
          onChange={(t) => wt.go("mypage", { tab: t }, { replace: true })}
          items={[
            ["services", "내 서비스", mine.length],
            ["saved", "저장한 서비스", saved.length],
            ["reviews", "내가 쓴 리뷰", myReviews.length],
            ["settings", "계정 설정"],
          ]}
        />
        <div className="pt-6">
          {tab === "services" &&
            (mine.length ? (
              <>
                <div className="mb-4 flex justify-end">
                  <RouteLink
                    to="manage"
                    className={buttonClass({ variant: "ghost", size: "sm" })}
                  >
                    <Icon name="grid" size={14} />내 서비스 관리로 이동
                  </RouteLink>
                </div>
                <ServiceList
                  items={mine}
                  renderItem={(s) =>
                    s.pub === "public" ? (
                      <ServiceCard s={s} />
                    ) : (
                      <HiddenServiceCard s={s} />
                    )
                  }
                />
              </>
            ) : (
              <EmptyState
                title="아직 등록한 서비스가 없어요"
                desc="직접 만든 웹 서비스를 등록하고 반응을 받아 보세요."
                action="서비스 등록하기"
                onAction={() => wt.go("register")}
                icon="plus"
              />
            ))}
          {tab === "saved" &&
            (saved.length ? (
              <ServiceList
                items={saved}
                renderItem={(s) =>
                  s.pub === "public" ? (
                    <ServiceCard s={s} />
                  ) : (
                    <SavedHiddenCard s={s} />
                  )
                }
              />
            ) : (
              <EmptyState
                title="저장한 서비스가 없어요"
                desc="마음에 드는 서비스를 저장해 두고 나중에 이용해 보세요."
                action="둘러보기"
                onAction={() => wt.go("home")}
                icon="bookmark"
              />
            ))}
          {tab === "reviews" &&
            (myReviews.length ? (
              <div>
                {myReviews.map((r) => {
                  const s = wt.svc(r.sid);
                  if (!s) return null;
                  return (
                    <div
                      key={r.id}
                      className="flex items-start gap-4 border-b border-border py-[18px]"
                    >
                      <ServiceIcon s={s} size={44} />
                      <div className="min-w-0 flex-1">
                        <RouteLink
                          to="detail"
                          params={{ id: s.id, tab: "reviews" }}
                          className="font-bold"
                        >
                          {s.name}
                        </RouteLink>
                        <div className={helpClass}>
                          {r.a.kind === "anon" ? "익명으로 작성 · " : ""}
                          {r.a.kind === "maker"
                            ? "제작자 리뷰"
                            : r.rate === "up"
                              ? "추천"
                              : r.rate === "down"
                                ? "비추천"
                                : "미설정"}{" "}
                          · {fmtDate(r.date)}
                        </div>
                        <p className={reviewText}>{r.text}</p>
                      </div>
                      <div className="flex">
                        <MiniButton
                          onClick={() =>
                            wt.setModal({
                              type: "review",
                              sid: s.id,
                              review: r,
                            })
                          }
                        >
                          <Icon name="edit" size={13} />
                          수정
                        </MiniButton>
                        <MiniButton
                          onClick={() =>
                            wt.setModal({ type: "delete-review", rid: r.id })
                          }
                        >
                          <Icon name="trash" size={13} />
                          삭제
                        </MiniButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="아직 쓴 리뷰가 없어요"
                desc="이용해 본 서비스에 리뷰를 남겨 제작자에게 힘이 되어 주세요."
                icon="edit"
              />
            ))}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </div>
      <Footer />
    </>
  );
}
