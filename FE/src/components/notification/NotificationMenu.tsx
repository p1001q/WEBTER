"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";
import { NotificationRow } from "./NotificationRow";

/** 헤더 알림 아이콘. 누르면 읽지 않은 최신 알림 3건이 펼쳐지고, 더보기로 알림 화면에 간다 */
export function NotificationMenu() {
  const wt = useWt();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const ref = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, []);
  const unread = wt.notifications
    .filter((n) => !n.read)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div ref={ref} className="relative">
      <IconButton
        className="relative @max-[385px]/app:size-9"
        aria-label={
          unread.length ? `알림 (읽지 않은 알림 ${unread.length}개)` : "알림"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="bell" size={21} />
        {unread.length > 0 && (
          <span
            className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-wine px-1 font-mono text-[10px] leading-4 font-bold text-white"
            aria-hidden="true"
          >
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </IconButton>
      {(open || leaving) && (
        <div
          className={cx(
            "absolute top-[calc(100%+8px)] right-0 z-40 w-[340px] max-w-[calc(100vw-32px)] rounded-md border border-border bg-card p-1.5 shadow-pop @max-[560px]/app:fixed @max-[560px]/app:top-[64px] @max-[560px]/app:right-4",
            leaving ? "pointer-events-none animate-fold" : "animate-unfold",
          )}
          role="menu"
          inert={leaving}
        >
          <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
            <b className="text-15">알림</b>
            <span className="text-12 text-muted">
              {unread.length ? `읽지 않음 ${unread.length}` : "모두 읽었어요"}
            </span>
          </div>
          <div className="mx-1 h-px bg-light" />
          {unread.length ? (
            unread
              .slice(0, 3)
              .map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  compact
                  onOpen={() => setOpen(false)}
                />
              ))
          ) : (
            <p className="m-0 px-3 py-6 text-center text-13 text-muted">
              읽지 않은 알림이 없어요.
            </p>
          )}
          <div className="mx-1 h-px bg-light" />
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center rounded-[6px] text-14 font-semibold text-ink hover:bg-light"
            onClick={() => {
              setOpen(false);
              wt.go("notifications");
            }}
          >
            더보기
          </button>
        </div>
      )}
    </div>
  );
}
