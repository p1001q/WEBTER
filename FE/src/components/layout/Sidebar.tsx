"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { CategoryGlyph } from "@/components/service/CategoryGlyph";
import { CATEGORIES } from "@/domain/options";
import { cx } from "@/lib/cx";
import { useRoute } from "@/lib/useRoute";
import { useWt } from "@/providers/context";
import { Wordmark } from "./Wordmark";

const label = "px-3 pt-4 pb-2 text-12 font-bold tracking-[.02em] text-muted";
const itemBase =
  "flex h-[42px] w-full items-center gap-2.5 rounded-md px-3 text-left text-15";
const cnt = "ml-auto font-mono text-11 text-muted";

/* 기본 접힘, 콘텐츠 위 오버레이. `useSearchParams` 를 쓰므로 AppShell 에서 Suspense 로 감싼다 */
export function Sidebar() {
  const wt = useWt();
  const route = useRoute();
  const asideRef = useRef<HTMLElement>(null);
  // 열리면 사이드바 안으로 포커스를 옮기고, 닫히면 열기 전 위치로 돌려 놓는다(뒤쪽 화면은 inert)
  useEffect(() => {
    if (!wt.side) return;
    const prev = document.activeElement as HTMLElement | null;
    asideRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => prev?.focus?.();
  }, [wt.side]);
  if (!wt.side) return null;
  const close = () => wt.setSide(false);
  const cat = route.query.cat;
  const curCat = cat || (route.name === "latest" ? "all" : null);
  const live = wt.publicServices.filter((s) => s.use === "live");
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [
      c.id,
      live.filter((s) => s.cats.includes(c.id)).length,
    ]),
  );
  const goCat = (id: string) => {
    close();
    wt.go("latest", id === "all" ? {} : { cat: id });
  };
  const itemClass = (on: boolean) =>
    cx(
      itemBase,
      on ? "bg-card font-bold shadow-card" : "font-medium hover:bg-ink/5",
    );
  return (
    <>
      <button
        className="fixed inset-0 z-50 w-full animate-fade cursor-default border-0 bg-scrim p-0"
        aria-label="메뉴 닫기"
        tabIndex={-1}
        onClick={close}
      />
      <aside
        ref={asideRef}
        className="fixed top-0 bottom-0 left-0 z-[51] flex w-side max-w-[84%] animate-slide flex-col border-r border-border bg-ivory"
        role="dialog"
        aria-label="사이드 메뉴"
      >
        <div className="flex h-header items-center gap-3 px-4">
          <IconButton className="-ml-1" onClick={close} aria-label="메뉴 닫기">
            <Icon name="close" size={20} />
          </IconButton>
          <Wordmark onClick={close} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pt-2 pb-6">
          <div className={label}>서비스 용도</div>
          <button
            className={itemClass(curCat === "all" && !cat)}
            onClick={() => goCat("all")}
          >
            전체<span className={cnt}>{live.length}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={itemClass(curCat === c.id)}
              onClick={() => goCat(c.id)}
            >
              <CategoryGlyph cat={c.id} size={18} />
              {c.label}
              <span className={cnt}>{counts[c.id]}</span>
            </button>
          ))}
          <div className={cx(label, "mt-2")}>내 메뉴</div>
          <button
            className={itemClass(false)}
            onClick={() => {
              close();
              wt.requireLogin(
                () => wt.go("mypage", { tab: "saved" }),
                "저장한 서비스는 로그인 후 볼 수 있어요.",
              );
            }}
          >
            <Icon name="bookmark" size={18} />
            저장한 서비스
            {wt.me ? (
              <span className={cnt}>{wt.saves.size}</span>
            ) : (
              <span className={cnt}>
                <Icon name="lock" size={13} />
              </span>
            )}
          </button>
          <button
            className={itemClass(false)}
            onClick={() => {
              close();
              wt.requireLogin(
                () => wt.go("manage"),
                "내 서비스 관리는 로그인 후 이용할 수 있어요.",
              );
            }}
          >
            <Icon name="grid" size={18} />내 서비스 관리
            {!wt.me && (
              <span className={cnt}>
                <Icon name="lock" size={13} />
              </span>
            )}
          </button>
        </div>
        <div className="border-t border-border px-6 pt-4 pb-6 text-13 text-muted">
          <div className="mb-0.5 font-bold text-ink">웹에서 놀다, 웹터.</div>
          개발자가 만든 웹 서비스를 발견하고 바로 이용해 보세요.
        </div>
      </aside>
    </>
  );
}
