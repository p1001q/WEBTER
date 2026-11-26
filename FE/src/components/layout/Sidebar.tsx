"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { cx } from "@/lib/cx";
import { useScrollLock } from "@/lib/useScrollLock";
import { useWt } from "@/providers/context";
import { SidebarNavigation } from "./SidebarNavigation";
import {
  DESKTOP_NAVIGATION_QUERY,
  useDesktopNavigation,
} from "./useDesktopNavigation";
import { Wordmark } from "./Wordmark";

/** 데스크톱은 상시 탐색, 좁은 화면은 본문 위에 열리는 메뉴로 구분한다. */
export function Sidebar() {
  const wt = useWt();
  const { setSide } = wt;
  const desktop = useDesktopNavigation();
  const open = wt.side && !desktop;
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_NAVIGATION_QUERY);
    const closeOnDesktop = () => {
      if (media.matches) setSide(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, [setSide]);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const aside = asideRef.current;
    aside?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSide(false);
      }
      if (event.key !== "Tab" || !aside) return;
      const targets = Array.from(
        aside.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
      const first = targets[0];
      const last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (prev?.isConnected && prev.getClientRects().length) prev.focus();
    };
  }, [open, setSide]);
  const [leaving, setLeaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    setLeaving(
      !open &&
        !desktop &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(false), 200);
    return () => clearTimeout(timer);
  }, [leaving]);
  useScrollLock(!desktop && (open || leaving));
  const close = () => setSide(false);
  return (
    <>
      <aside
        aria-label="고정 사이드 메뉴"
        className="sticky top-header hidden h-[calc(100dvh-var(--spacing-header))] flex-col border-r border-border @min-[1180px]/shell:flex"
        inert={wt.modal !== null}
      >
        <SidebarNavigation />
      </aside>
      {!desktop && (open || leaving) && (
        <>
          <button
            className={cx(
              "fixed inset-0 z-50 w-full cursor-default border-0 bg-scrim p-0",
              leaving ? "pointer-events-none animate-fade-out" : "animate-fade",
            )}
            aria-label="메뉴 닫기"
            tabIndex={-1}
            onClick={close}
          />
          <aside
            ref={asideRef}
            id="mobile-sidebar"
            className={cx(
              "fixed inset-y-0 left-0 z-[51] flex w-side max-w-[84%] flex-col border-r border-border bg-ivory",
              leaving
                ? "pointer-events-none animate-slide-out"
                : "animate-slide",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="사이드 메뉴"
            inert={leaving || wt.modal !== null}
          >
            <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
              <IconButton
                className="-ml-1"
                onClick={close}
                aria-label="메뉴 닫기"
              >
                <Icon name="close" size={20} />
              </IconButton>
              <Wordmark onClick={close} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNavigation onNavigate={close} />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
