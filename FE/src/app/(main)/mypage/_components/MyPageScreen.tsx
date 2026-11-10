"use client";

import { useEffect, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { ServiceIcon } from "@/components/service/ServiceIcon";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { MiniButton } from "@/components/ui/MiniButton";
import { RouteLink } from "@/components/ui/RouteLink";
import { Tabs } from "@/components/ui/Tabs";
import { helpClass } from "@/components/ui/field";
import { fmtDate } from "@/domain/format";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";
import { MYPAGE_TABS, type MyPageTab as Tab } from "../tabs";
import { MyServiceList } from "./MyServiceList";
import { SettingsPanel } from "./SettingsPanel";

const reviewText =
  "m-0 mt-1.5 text-14 leading-[1.7] whitespace-pre-line text-[#3a3a3a] [overflow-wrap:anywhere]";

/** 마이페이지: 내 서비스·저장한 서비스·내가 쓴 리뷰·계정 설정 */
export function MyPageScreen({ tab: tabParam }: { tab: Tab }) {
  const wt = useWt();
  // 탭이 오른쪽으로 가면 본문도 오른쪽에서, 왼쪽으로 가면 왼쪽에서 들어온다
  const [slide, setSlide] = useState<"r" | "l">("r");
  // 탭은 바로 바뀌고(주소 갱신을 기다리지 않는다), 주소가 바뀌면 그 값을 따른다
  const [tab, setTab] = useState<Tab>(tabParam);
  const goTab = (t: Tab) => {
    setSlide(MYPAGE_TABS.indexOf(t) >= MYPAGE_TABS.indexOf(tab) ? "r" : "l");
    setTab(t);
    wt.go("mypage", { tab: t }, { replace: true });
  };
  const [prevParam, setPrevParam] = useState(tabParam);
  if (prevParam !== tabParam) {
    setPrevParam(tabParam);
    setTab(tabParam);
  }
  const me = wt.me!;
  const { loadMypage } = wt;
  // 실제 서버 연결에서는 서비스를 가리지 않고 내가 쓴 리뷰·댓글과 저장한 순서를 서버에서 가져온다(실패해도 이미 있는 내용으로 보여 준다)
  useEffect(() => {
    loadMypage().catch(() => {});
  }, [loadMypage]);
  const mine = wt.services.filter((s) => s.owner === me.id);
  // 담은 순서(먼저 담은 것이 앞)를 그대로 둔다. 저장한 서비스의 정렬이 이 순서를 쓴다
  const saved = [...wt.saves].flatMap((id) => wt.svc(id) ?? []);
  const myReviews = wt.reviews.filter(
    (r) => r.permissions?.mine ?? (r.a.uid === me.id && r.a.kind !== "guest"),
  );
  const myComments = wt.comments.filter(
    (c) =>
      !c.deleted &&
      (c.permissions?.mine ?? (c.a.uid === me.id && c.a.kind !== "left")),
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
              <RouteLink
                to="profile"
                params={{ id: me.id }}
                className="text-13 font-medium text-muted underline underline-offset-[3px] hover:text-ink"
              >
                내 프로필 보기
              </RouteLink>
            </h1>
            {me.bio && <p className="m-0 text-text-2">{me.bio}</p>}
            <div className="flex flex-wrap gap-5 text-14 text-muted [&_b]:ml-0.5 [&_b]:font-extrabold [&_b]:text-ink">
              <span>
                내 서비스<b>{mine.length}</b>
              </span>
              <span>
                저장<b>{saved.length}</b>
              </span>
              <span>
                리뷰<b>{myReviews.length}</b>
              </span>
              <span>
                댓글<b>{myComments.length}</b>
              </span>
            </div>
          </div>
        </div>
        <Tabs<Tab>
          // 리뷰와 댓글은 한 탭("리뷰·댓글")으로 묶고, 안에서 하위 탭으로 나눈다
          value={tab === "comments" ? "reviews" : tab}
          onChange={goTab}
          items={[
            ["services", "내 서비스", mine.length],
            ["saved", "저장한 서비스", saved.length],
            ["reviews", "리뷰·댓글", myReviews.length + myComments.length],
            ["settings", "계정 설정"],
          ]}
          aside={
            tab === "services" &&
            mine.length > 0 && (
              <RouteLink
                to="manage"
                className="text-13 font-medium whitespace-nowrap text-muted underline underline-offset-[3px] hover:text-ink"
              >
                <span className="@max-[560px]/app:hidden">내 서비스 </span>
                관리로 이동
              </RouteLink>
            )
          }
        />
        {(tab === "reviews" || tab === "comments") && (
          <div className="mt-2">
            <Tabs<Tab>
              value={tab}
              onChange={goTab}
              items={[
                ["reviews", "내가 쓴 리뷰", myReviews.length],
                ["comments", "내가 쓴 댓글", myComments.length],
              ]}
            />
          </div>
        )}
        <div
          key={tab}
          className={cx(
            tab === "services" || tab === "saved" ? "pt-2" : "pt-6",
            slide === "r" ? "animate-slide-in-r" : "animate-slide-in-l",
          )}
        >
          {tab === "services" &&
            (mine.length ? (
              <MyServiceList kind="mine" items={mine} />
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
              <MyServiceList kind="saved" items={saved} />
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
          {tab === "comments" &&
            (myComments.length ? (
              <div>
                {myComments.map((c) => {
                  const s = wt.svc(c.sid);
                  if (!s) return null;
                  return (
                    <div
                      key={c.id}
                      className="flex items-start gap-4 border-b border-border py-[18px]"
                      data-my-comment={c.id}
                    >
                      <ServiceIcon s={s} size={44} />
                      <div className="min-w-0 flex-1">
                        <RouteLink
                          to="detail"
                          params={{ id: s.id, tab: "comments" }}
                          className="font-bold"
                        >
                          {s.name}
                        </RouteLink>
                        <div className={helpClass}>
                          {c.parent ? "답글 · " : ""}
                          {c.a.kind === "anon" ? "익명으로 작성 · " : ""}
                          {fmtDate(c.date)}
                          {c.edited && " (수정됨)"}
                        </div>
                        <p className={reviewText}>{c.text}</p>
                      </div>
                      <div className="flex">
                        <MiniButton
                          onClick={() =>
                            wt.setModal({
                              type: "comment",
                              sid: s.id,
                              comment: c,
                            })
                          }
                        >
                          <Icon name="edit" size={13} />
                          수정
                        </MiniButton>
                        <MiniButton
                          onClick={() =>
                            wt.setModal({ type: "delete-comment", cid: c.id })
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
                title="아직 쓴 댓글이 없어요"
                desc="서비스 상세의 댓글 탭에서 제작자와 다른 사용자에게 이야기를 남겨 보세요."
                icon="reply"
              />
            ))}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </div>
      <Footer />
    </>
  );
}
