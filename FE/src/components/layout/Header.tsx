"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { ScopeBadge } from "@/components/ui/ScopeBadge";
import { useWt } from "@/providers/context";
import { Wordmark } from "./Wordmark";

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
    <header className="sticky top-0 z-30 border-b border-transparent bg-ivory">
      <div className="page-wrap flex h-header items-center gap-3 @max-[560px]/app:h-14 @max-[560px]/app:gap-1">
        <IconButton
          className="-ml-2"
          onClick={() => wt.setSide(true)}
          aria-label="메뉴 열기"
          aria-expanded={wt.side}
        >
          <Icon name="menu" size={22} />
        </IconButton>
        <Wordmark />
        <div className="ml-auto flex items-center gap-2">
          <IconButton aria-label="검색" onClick={() => wt.go("search", {})}>
            <Icon name="search" size={21} />
          </IconButton>
          <Button
            variant="outline"
            className="@max-[560px]/app:hidden"
            onClick={register}
          >
            <Icon name="plus" size={16} stroke={2.2} />
            서비스 등록
          </Button>
          <IconButton
            className="@min-[561px]/app:hidden"
            onClick={register}
            aria-label="서비스 등록"
          >
            <Icon name="plus" size={21} />
          </IconButton>
          {me ? (
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
              {open && (
                <div
                  className="absolute top-[calc(100%+8px)] right-0 z-40 min-w-[248px] animate-pop-sm rounded-md border border-border bg-card p-1.5 shadow-pop"
                  role="menu"
                >
                  <div className="flex items-center gap-3 px-3 pt-3 pb-3.5">
                    <Avatar user={me} size={44} />
                    <div className="min-w-0">
                      <div className="text-15 font-bold">{me.nick}</div>
                      <div className="font-mono text-12 text-muted">
                        @{me.handle}
                      </div>
                    </div>
                  </div>
                  <div className={popSep} />
                  {item("user", "마이페이지", () => wt.go("mypage"))}
                  {item("grid", "내 서비스 관리", () => wt.go("manage"))}
                  {item(
                    "bookmark",
                    "저장한 서비스",
                    () => wt.go("mypage", { tab: "saved" }),
                    wt.saves.size,
                  )}
                  {item("eye", "내 프로필 보기", () =>
                    wt.go("profile", { id: me.id }),
                  )}
                  {item("settings", "계정 설정", () =>
                    wt.go("mypage", { tab: "settings" }),
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
              onClick={() => wt.go("login", { back: wt.currentPath() })}
            >
              로그인
            </Button>
          )}
          <span className="inline-flex items-center gap-1">
            <IconButton
              shape="square"
              aria-label="오픈소스 영역"
              title="오픈소스 영역"
              onClick={() => wt.go("opensource")}
            >
              <Icon name="code" size={18} stroke={1.9} />
            </IconButton>
            <ScopeBadge />
          </span>
        </div>
      </div>
    </header>
  );
}
