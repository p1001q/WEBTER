"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface ToastContent {
  msg: ReactNode;
  err?: boolean;
  action?: string;
  onAction?: () => void;
}

/**
 * 화면 아래 가운데에 잠깐 보이는 알림. 통통 튀며 떠오르고, 사라질 때는 아래로 가라앉으며 흐려진다.
 * `toast` 가 null 이 되어도 사라지는 모션이 끝날 때까지는 마지막 내용을 그린다.
 */
export function Toast({ toast }: { toast: ToastContent | null }) {
  const [shown, setShown] = useState(toast);
  const [seq, setSeq] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [wasOn, setWasOn] = useState(!!toast);
  if (toast && toast !== shown) {
    setShown(toast);
    setSeq((n) => n + 1);
    setLeaving(false);
  }
  if (wasOn !== !!toast) {
    setWasOn(!!toast);
    setLeaving(
      !toast && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setLeaving(false), 280);
    return () => clearTimeout(t);
  }, [leaving]);
  const t = toast ?? (leaving ? shown : null);
  if (!t) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-8 z-70 flex justify-center px-4 @max-[560px]/app:bottom-5"
      role="status"
    >
      <div
        key={seq}
        className={cx(
          "flex max-w-full items-center gap-2.5 rounded-pill px-[18px] py-3 text-14 font-medium text-white shadow-pop",
          toast ? "pointer-events-auto animate-toast-in" : "animate-toast-out",
          t.err ? "bg-wine" : "bg-ink",
        )}
      >
        {t.msg}
        {t.action && (
          <button
            type="button"
            className="p-0 text-14 font-bold whitespace-nowrap text-butter"
            onClick={t.onAction}
          >
            {t.action}
          </button>
        )}
      </div>
    </div>
  );
}
