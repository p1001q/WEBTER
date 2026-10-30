"use client";

import { Footer } from "@/components/layout/Footer";
import { Restricted } from "@/components/layout/Restricted";
import { SectionHead } from "@/components/layout/SectionHead";
import { ServiceList } from "@/components/service/ServiceList";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { MiniButton } from "@/components/ui/MiniButton";
import { RouteLink } from "@/components/ui/RouteLink";
import { fmtNum } from "@/domain/format";
import { LINK_ICON, LINK_LABEL } from "@/domain/options";
import { useWt } from "@/providers/context";

/** 제작자 프로필: 소개·외부 링크·등록한 서비스 */
export function ProfileScreen({ id }: { id: string }) {
  const wt = useWt();
  const u = Object.hasOwn(wt.users, id) ? wt.users[id] : undefined;
  if (!u)
    return (
      <Restricted
        title="사용자를 찾을 수 없어요"
        desc="탈퇴했거나 주소가 잘못되었어요."
      />
    );
  const list = wt.publicServices.filter((s) => s.owner === u.id);
  const likes = list.reduce((a, s) => a + s.likes, 0);
  const isMe = !!wt.me && wt.me.id === u.id;
  const reported = wt.reported.has("profile:" + u.id);
  return (
    <>
      <div className="page-wrap">
        <div className="flex flex-wrap items-center gap-6 pt-8 pb-6">
          <Avatar user={u} size={96} />
          <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
            <h1 className="m-0 flex flex-wrap items-baseline gap-2.5 text-28 font-extrabold tracking-[-0.02em]">
              {u.nick}
              <small className="font-mono text-14 font-medium text-muted">
                @{u.handle}
              </small>
            </h1>
            {u.bio && <p className="m-0 text-text-2">{u.bio}</p>}
            <div className="flex flex-wrap gap-5 text-14 text-muted">
              <span>
                <b className="mr-0.5 font-extrabold text-ink">{list.length}</b>
                등록한 서비스
              </span>
              <span>
                <b className="mr-0.5 font-extrabold text-ink">
                  {fmtNum(likes)}
                </b>
                받은 좋아요
              </span>
            </div>
            {u.links.length > 0 && (
              <div
                className="flex flex-wrap gap-1.5"
                aria-label="외부 링크"
                data-component="profile-links"
              >
                {u.links.map(([k, url]) => (
                  <a
                    key={k}
                    href="#"
                    className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-border bg-card px-2.5 text-13 font-semibold hover:border-border-strong"
                    onClick={(e) => {
                      e.preventDefault();
                      wt.toast(`데모: ${url} 로 이동하지 않아요.`);
                    }}
                    aria-label={`${LINK_LABEL[k]} (외부 링크)`}
                  >
                    <Icon name={LINK_ICON[k]} size={15} />
                    {LINK_LABEL[k]}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {isMe ? (
              <RouteLink
                to="mypage"
                params={{ tab: "settings" }}
                className={buttonClass({ variant: "ghost" })}
              >
                프로필 수정
              </RouteLink>
            ) : reported ? (
              <MiniButton disabled>
                <Icon name="check" size={13} />
                신고 완료
              </MiniButton>
            ) : (
              <MiniButton
                onClick={() =>
                  wt.requireLogin(
                    () =>
                      wt.setModal({
                        type: "report",
                        target: {
                          type: "profile",
                          key: "profile:" + u.id,
                          label: u.nick,
                        },
                      }),
                    "신고는 로그인한 회원만 할 수 있어요.",
                  )
                }
              >
                <Icon name="flag" size={13} />
                프로필 신고
              </MiniButton>
            )}
          </div>
        </div>
        <hr className="m-0 h-px border-0 bg-border" />
        <section className="mt-8">
          <SectionHead title="등록한 서비스" sub={`${list.length}개`} />
          {list.length ? (
            <ServiceList items={list} />
          ) : (
            <EmptyState title="공개된 서비스가 없어요" desc="" icon="grid" />
          )}
        </section>
      </div>
      <Footer />
    </>
  );
}
