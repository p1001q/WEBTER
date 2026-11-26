"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { cx } from "@/lib/cx";
import { usePressHold } from "@/lib/usePressHold";
import { useWt } from "@/providers/context";
import { NotificationMenu } from "@/components/notification/NotificationMenu";
import { Wordmark } from "./Wordmark";
import { HeaderSearch } from "./HeaderSearch";
import { SearchBar } from "./SearchBar";

const popItem =
  "flex h-10 w-full items-center gap-2.5 rounded-[6px] px-3 text-left text-14 text-ink hover:bg-light focus-visible:bg-light";
const popSep = "mx-1 my-1.5 h-px bg-light";

export function Header() {
  const wt = useWt();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, []);
  // 닫을 때는 위로 살짝 사라지는 모션이 끝난 뒤에 화면에서 뺀다. 모션 줄이기 설정에서는 바로 뺀다
  const [leaving, setLeaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    setLeaving(
      !open && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setLeaving(false), 190);
    return () => clearTimeout(t);
  }, [leaving]);
  const press = usePressHold(340);
  const me = wt.me;
  const register = () =>
    wt.requireLogin(
      () => wt.go("register"),
      "서비스를 등록하려면 로그인이 필요해요.",
    );
  const item = (
    icon: IconName,
    label: string,
    fn: () => void,
    extra?: number,
  ) => (
    <button
      className={popItem}
      role="menuitem"
      onClick={() => {
        setOpen(false);
        fn();
      }}
    >
      <Icon name={icon} size={17} />
      {label}
      {extra != null && (
        <span className="ml-auto font-mono text-11 text-muted">{extra}</span>
      )}
    </button>
  );
  return (
    <header className="border-b border-border bg-ivory">
      <div className="shell-header grid min-h-[calc(var(--spacing-header)-1px)] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 @max-[860px]/app:grid-cols-[auto_1fr_auto] @max-[860px]/app:gap-x-2 @max-[860px]/app:pt-3 @max-[860px]/app:pb-4 @min-[1180px]/shell:grid-cols-[minmax(240px,1fr)_minmax(0,640px)_minmax(240px,1fr)]">
        <div className="flex items-center gap-3 @max-[860px]/app:col-span-2 @max-[560px]/app:h-12">
          <IconButton
            className="-ml-2 @max-[385px]/app:size-9 @min-[1180px]/shell:hidden"
            onClick={() => wt.setSide(true)}
            aria-label="메뉴 열기"
            aria-expanded={wt.side}
            aria-controls="mobile-sidebar"
          >
            <Icon name="menu" size={22} />
          </IconButton>
          <Wordmark />
        </div>
        <div className="w-full max-w-[640px] justify-self-center @max-[860px]/app:order-last @max-[860px]/app:col-span-3 @max-[860px]/app:max-w-none">
          <Suspense fallback={<SearchBar size="sm" />}>
            <HeaderSearch />
          </Suspense>
        </div>
        <div className="flex items-center justify-self-end gap-2 @max-[399px]/app:gap-1">
          {me && <NotificationMenu />}
          <Button
            variant="outline"
            className={cx(
              "transition-[color,background-color,scale]! duration-[380ms]! ease-[cubic-bezier(0.22,1,0.36,1)]! @max-[560px]/app:hidden",
              press.pressed && "scale-[.88]! bg-black! text-white!",
            )}
            {...press.bind}
            onClick={register}
          >
            <Icon name="plus" size={16} stroke={2.2} />
            서비스 등록
          </Button>
          <IconButton
            className="@min-[561px]/app:hidden @max-[385px]/app:size-9"
            onClick={register}
            aria-label="서비스 등록"
          >
            <Icon name="plus" size={21} />
          </IconButton>
          {!wt.sessionReady ? (
            // 서버 세션을 확인하기 전에는 로그인 상태를 알 수 없으므로, 잘못된 버튼이 번쩍이지 않게 자리만 둔다
            <span aria-hidden className="h-[42px] w-[66px]" />
          ) : me ? (
            <div ref={ref} className="relative">
              <button
                className="flex items-center gap-1 rounded-pill p-1 text-muted"
                onClick={() => setOpen((o) => !o)}
                aria-label="프로필 메뉴"
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <Avatar user={me} size={34} />
                <Icon name="chevDown" size={16} />
              </button>
              {(open || leaving) && (
                <div
                  className={cx(
                    "absolute top-[calc(100%+8px)] right-0 z-40 min-w-[248px] rounded-md border border-border bg-card p-1.5 shadow-pop",
                    leaving
                      ? "pointer-events-none animate-fold"
                      : "animate-unfold",
                  )}
                  role="menu"
                  inert={leaving}
                >
                  <button
                    type="button"
                    role="menuitem"
                    aria-label={`${me.nick} 마이페이지로 이동`}
                    className="flex w-full items-center gap-3 rounded-md px-3 pt-3 pb-3.5 text-left hover:bg-light focus-visible:bg-light"
                    onClick={() => {
                      setOpen(false);
                      wt.go("mypage");
                    }}
                  >
                    <Avatar user={me} size={44} />
                    <div className="min-w-0">
                      <div className="text-15 font-bold">{me.nick}</div>
                      <div className="font-mono text-12 text-muted">
                        @{me.handle}
                      </div>
                    </div>
                  </button>
                  <div className={popSep} />
                  {item("user", "마이페이지", () => wt.go("mypage"))}
                  {item("eye", "프로필 보기", () =>
                    wt.go("profile", { id: me.id }),
                  )}
                  {item("settings", "프로필 수정", () =>
                    wt.go("mypage", { tab: "settings" }),
                  )}
                  {item("grid", "서비스 관리", () => wt.go("manage"))}
                  {item(
                    "bookmark",
                    "저장한 서비스",
                    () => wt.go("mypage", { tab: "saved" }),
                    wt.saves.size,
                  )}
                  <div className={popSep} />
                  {item("logout", "로그아웃", () => {
                    wt.logout();
                  })}
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="ink"
              className="@max-[385px]/app:px-2.5"
              onClick={() => wt.go("login", { back: wt.currentPath() })}
            >
              로그인
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
