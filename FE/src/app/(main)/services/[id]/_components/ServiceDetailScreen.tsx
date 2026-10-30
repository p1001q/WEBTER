"use client";

import { useEffect, useRef, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Restricted } from "@/components/layout/Restricted";
import { SectionHead } from "@/components/layout/SectionHead";
import { GradeBadge } from "@/components/review/GradeBadge";
import { ReviewSection } from "@/components/review/ReviewSection";
import { Gallery } from "@/components/service/Gallery";
import { ServiceList } from "@/components/service/ServiceList";
import { StatusBadge } from "@/components/service/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { MiniButton } from "@/components/ui/MiniButton";
import { RouteLink } from "@/components/ui/RouteLink";
import { Tabs } from "@/components/ui/Tabs";
import { tagClass } from "@/components/ui/Tag";
import { boxClass } from "@/components/ui/box";
import { helpClass } from "@/components/ui/field";
import { buttonClass } from "@/components/ui/Button";
import { fmtNum } from "@/domain/format";
import { CAT } from "@/domain/options";
import { ratioText } from "@/domain/review";
import { scoreOf } from "@/domain/score";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";
import { ServiceOverview } from "./ServiceOverview";
import { ServiceVersions } from "./ServiceVersions";

type Tab = "about" | "reviews";

const banner = "mb-6 flex items-center gap-2.5 rounded-md px-4 py-3 text-14";
const statCell =
  "flex flex-col items-center gap-1 border-border px-2 py-4 text-center";
const statValue =
  "text-18 font-extrabold tabular-nums @max-[560px]/app:text-16";
const statKey = "text-12 text-muted";

/** 서비스 상세. 없는 서비스·비공개 서비스는 안내 화면을 본문으로 보여 준다(HTTP 200) */
export function ServiceDetailScreen({
  id,
  tab: tabParam,
}: {
  id: string;
  tab?: Tab;
}) {
  const wt = useWt();
  const s = wt.svc(id);
  const [tab, setTab] = useState<Tab>(tabParam ?? "about");
  const counted = useRef<string>(undefined);
  useEffect(() => {
    if (s && s.pub === "public" && counted.current !== s.id) {
      counted.current = s.id;
      wt.countView(s);
    }
    // 서비스가 바뀔 때 한 번만 조회수를 센다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s?.id]);
  if (!s)
    return (
      <Restricted
        title="서비스를 찾을 수 없어요"
        desc="삭제되었거나 주소가 잘못되었어요."
      />
    );
  const isOwner = !!wt.me && s.owner === wt.me.id;
  if (s.pub !== "public" && !isOwner) return <Restricted />;
  if (s.pub !== "public" && isOwner)
    return (
      <Restricted
        title="비공개 상태의 서비스예요"
        desc="비공개 서비스의 상태와 사유는 내 서비스 관리에서 확인할 수 있어요."
      />
    );
  const owner = wt.users[s.owner];
  const agg = wt.agg(s);
  const down = s.use === "stop";
  const reported = wt.reported.has("service:" + s.id);
  const similar = wt.publicServices
    .filter(
      (x) =>
        x.id !== s.id &&
        x.use === "live" &&
        x.cats.some((c) => s.cats.includes(c)),
    )
    .sort((a, b) => scoreOf(b, "m") - scoreOf(a, "m"))
    .slice(0, 4);
  const stats: [string, string][] = [
    [fmtNum(s.views), "조회수"],
    [fmtNum(s.clicks), "이용하기 클릭"],
    [fmtNum(s.likes), "좋아요"],
    [fmtNum(s.saves), "저장"],
  ];
  return (
    <>
      <div className="page-wrap">
        <nav
          className="flex flex-wrap items-center gap-1.5 py-6 text-13 text-muted @max-[560px]/app:py-4"
          aria-label="현재 위치"
        >
          <RouteLink to="home" className="hover:text-ink">
            홈
          </RouteLink>
          <Icon name="chevRight" size={13} />
          <RouteLink
            to="latest"
            params={{ cat: s.cats[0] }}
            className="hover:text-ink"
          >
            {CAT[s.cats[0]].label}
          </RouteLink>
          <Icon name="chevRight" size={13} />
          <span className="font-semibold text-ink">{s.name}</span>
        </nav>
        {down && (
          <div
            className={`${banner} border border-border bg-light text-ink`}
            role="status"
            data-component="unavailable-banner"
          >
            <StatusBadge kind="stop" />
            <span>
              <b>지금은 이용할 수 없어요.</b> {s.stopReason}
            </span>
          </div>
        )}
        {isOwner && (
          <div
            className={`${banner} bg-navy-50 text-navy`}
            data-component="owner-banner"
          >
            <Icon name="info" size={16} />
            내가 등록한 서비스예요. 본인 서비스에는 좋아요·저장을 할 수 없고,
            리뷰는 “제작자” 표시로 남겨지며 평가 집계에서 빠져요.
            <RouteLink
              to="edit"
              params={{ id: s.id }}
              className="ml-auto font-bold text-navy underline underline-offset-[3px]"
            >
              수정하기
            </RouteLink>
          </div>
        )}
        <ServiceOverview s={s} isOwner={isOwner} />
        <div
          className="mt-8 grid grid-cols-5 border-y border-border @max-[860px]/app:grid-cols-3"
          data-component="detail-stats"
        >
          {stats.map(([v, k], i) => (
            <div
              key={k}
              className={cx(
                statCell,
                i > 0 && "border-l",
                i === 3 && "@max-[860px]/app:border-l-0",
                i >= 3 && "@max-[860px]/app:border-t",
              )}
            >
              <span className={statValue}>{v}</span>
              <span className={statKey}>{k}</span>
            </div>
          ))}
          <div className={cx(statCell, "border-l @max-[860px]/app:border-t")}>
            <GradeBadge grade={agg.grade} />
            <span className={statKey}>
              추천 {ratioText(agg.ratio)} · 리뷰 {agg.total}
            </span>
          </div>
        </div>
        <Gallery s={s} />
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_var(--spacing-detail-cta)] items-start gap-12 @max-[860px]/app:grid-cols-1 @max-[860px]/app:gap-6">
          <div className="min-w-0">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                ["about", "소개"],
                ["reviews", "리뷰", agg.total],
              ]}
            />
            {tab === "about" ? (
              <div className="pt-6">
                <p
                  className={cx(
                    "m-0 mb-4 text-[15.5px] leading-[1.75] text-pretty whitespace-pre-line",
                    s.desc ? "text-[#3a3a3a]" : "text-muted",
                  )}
                >
                  {s.desc || "상세 설명이 아직 없어요."}
                </p>
                {s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" aria-label="태그">
                    {s.tags.map((t) => (
                      <RouteLink
                        key={t}
                        to="search"
                        params={{ q: t }}
                        className={tagClass}
                      >
                        #{t}
                      </RouteLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <ReviewSection s={s} />
            )}
            <ServiceVersions s={s} />
          </div>
          <aside className="flex flex-col gap-3">
            <div
              className={`${boxClass} flex flex-col gap-3 p-6`}
              data-component="maker-card"
            >
              <div className={helpClass}>만든 사람</div>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={owner} size={48} />
                <div className="min-w-0">
                  <b>{owner.nick}</b>
                  <div className="font-mono text-12 text-muted">
                    @{owner.handle}
                  </div>
                </div>
              </div>
              <p className="m-0 text-[13.5px] text-text-2">{owner.bio}</p>
              <RouteLink
                to="profile"
                params={{ id: owner.id }}
                className={buttonClass({ variant: "ghost", size: "sm" })}
              >
                프로필 보기
              </RouteLink>
            </div>
            {!isOwner &&
              (reported ? (
                <MiniButton disabled className="self-start">
                  <Icon name="check" size={13} />
                  신고 완료
                </MiniButton>
              ) : (
                <MiniButton
                  className="self-start"
                  onClick={() =>
                    wt.requireLogin(
                      () =>
                        wt.setModal({
                          type: "report",
                          target: {
                            type: "service",
                            key: "service:" + s.id,
                            label: s.name,
                          },
                        }),
                      "신고는 로그인한 회원만 할 수 있어요.",
                    )
                  }
                >
                  <Icon name="flag" size={13} />이 서비스 신고
                </MiniButton>
              ))}
          </aside>
        </div>
        {similar.length > 0 && (
          <section className="mt-14 @max-[560px]/app:mt-10">
            <SectionHead
              title="비슷한 서비스"
              sub={`${CAT[s.cats[0]].label} 용도의 다른 서비스`}
            />
            <ServiceList items={similar} />
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
