"use client";

import type { Service } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { RouteLink } from "@/components/ui/RouteLink";
import { ServiceIcon } from "@/components/service/ServiceIcon";
import { fmt } from "@/domain/format";
import { CAT, OPTL } from "@/domain/options";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";

const meta =
  "mr-3 inline-flex items-center gap-1 border-r border-border pr-3 last:border-r-0";
const ctaButton = "h-10! rounded-md! px-2.5!";

/** 상세 상단: 아이콘·이름·분류·메타·제작자와 이용하기·좋아요·저장 */
export function ServiceOverview({
  s,
  isOwner,
}: {
  s: Service;
  isOwner: boolean;
}) {
  const wt = useWt();
  const owner = wt.users[s.owner];
  const liked = wt.likes.has(s.id);
  const saved = wt.saves.has(s.id);
  const down = s.use === "stop";
  const react = (kind: "like" | "save") => {
    if (isOwner) return;
    wt.requireLogin(
      () => {
        if (kind === "like") wt.toggleLike(s.id);
        else wt.toggleSave(s.id);
      },
      kind === "like"
        ? "좋아요는 로그인한 회원만 누를 수 있어요."
        : "저장은 로그인한 회원만 할 수 있어요.",
    );
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_var(--spacing-detail-cta)] items-start gap-12 @max-[860px]/app:grid-cols-1 @max-[860px]/app:gap-6">
      <div className="flex min-w-0 items-start gap-6 @max-[560px]/app:gap-4">
        <ServiceIcon s={s} size={96} />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <h1 className="m-0 text-34 leading-[1.2] font-extrabold tracking-[-0.03em] [overflow-wrap:anywhere] @max-[560px]/app:text-[25px]">
            {s.name}
          </h1>
          <p className="m-0 text-[16.5px] text-pretty text-text-2 @max-[560px]/app:text-15">
            {s.tagline}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {s.cats.map((c, i) => (
              <RouteLink
                key={c}
                to="latest"
                params={{ cat: c }}
                className={cx(
                  "inline-flex h-6 items-center rounded-sm border bg-card px-2.5 text-12 font-semibold whitespace-nowrap text-ink",
                  i === 0 ? "border-ink" : "border-border",
                )}
              >
                {CAT[c].label}
              </RouteLink>
            ))}
          </div>
          <div className="flex flex-wrap gap-y-1.5 text-13 text-text-3">
            <span className={meta}>{OPTL.type[s.type]}</span>
            <span className={meta}>
              <Icon
                name={
                  s.devices.length > 1
                    ? "globe"
                    : s.devices[0] === "pc"
                      ? "desktop"
                      : "phone"
                }
                size={14}
              />
              <b className="font-semibold text-ink">
                {s.devices.map((d) => OPTL.devices[d]).join(" · ")}
              </b>
            </span>
            <span className={meta}>{OPTL.price[s.price]}</span>
            <span className={meta}>
              {s.team ? (
                <>
                  팀 ·{" "}
                  <b className="font-semibold text-ink [overflow-wrap:anywhere]">
                    {s.team}
                  </b>
                </>
              ) : (
                "개인"
              )}
            </span>
            <span className={meta}>
              {s.langs.map((l) => OPTL.langs[l]).join(" · ")}
            </span>
            <span className={meta}>웹 서비스</span>
          </div>
          <RouteLink
            to="profile"
            params={{ id: owner.id }}
            className="group mt-0.5 inline-flex items-center gap-2 self-start text-14 text-muted"
          >
            <Avatar user={owner} size={26} />
            <b className="font-bold text-ink group-hover:underline">
              {owner.nick}
            </b>
            <span className="font-mono text-12">@{owner.handle}</span>
          </RouteLink>
        </div>
      </div>
      <div className="flex flex-col gap-2" data-component="detail-cta">
        <Button
          className="h-[52px]! w-full rounded-md! text-16!"
          disabled={down}
          onClick={() => wt.launch(s)}
          aria-label={`${s.name} 이용하기 (새 탭에서 열림)`}
        >
          이용하기 <Icon name="external" size={17} stroke={2} />
        </Button>
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2">
          <Button
            variant="ghost"
            className={cx(
              ctaButton,
              liked && "border-like! bg-wine-50! text-like!",
            )}
            aria-label={`좋아요 ${s.likes.toLocaleString("ko-KR")}개`}
            aria-pressed={liked}
            disabled={isOwner}
            title={
              isOwner ? "본인 서비스에는 좋아요를 할 수 없어요" : undefined
            }
            onClick={() => react("like")}
          >
            <Icon name="heart" size={16} fill={liked} />
            {fmt(s.likes)}
          </Button>
          <Button
            variant="ghost"
            className={cx(
              ctaButton,
              saved && "border-save! bg-navy-50! text-save!",
            )}
            aria-pressed={saved}
            disabled={isOwner}
            title={isOwner ? "본인 서비스는 저장할 수 없어요" : undefined}
            onClick={() => react("save")}
          >
            <Icon name="bookmark" size={16} fill={saved} />
            {saved ? "저장됨" : "저장"}
          </Button>
          <IconButton
            shape="square"
            aria-label="링크 복사"
            title="링크 복사"
            onClick={() => wt.copyLink(s)}
          >
            <Icon name="copy" size={17} />
          </IconButton>
          {s.github ? (
            <IconButton
              shape="square"
              aria-label="소스 보기"
              title="소스 보기"
              onClick={() => wt.openSource(s)}
            >
              <Icon name="code" size={17} />
            </IconButton>
          ) : null}
        </div>
        {isOwner && (
          <p className="m-0 text-12 text-muted">
            본인 서비스에는 좋아요·저장을 할 수 없어요.
          </p>
        )}
        <p className="mt-0.5 mb-0 text-12 leading-[1.5] text-muted">
          외부 사이트로 연결되며 해당 서비스의 약관과 개인정보 처리는 제작자
          기준입니다.
        </p>
      </div>
    </div>
  );
}
