"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface ToastContent {
  msg: ReactNode;
  err?: boolean;
  action?: string;
  onAction?: () => void;
}

/** 화면 아래 가운데에 잠깐 보이는 알림. `toast` 가 null 이면 그리지 않는다 */
export function Toast({ toast }: { toast: ToastContent | null }) {
  if (!toast) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-8 z-70 flex justify-center px-4 @max-[560px]/app:bottom-5"
      role="status"
    >
      <div
        className={cx(
          "pointer-events-auto flex max-w-full animate-toast items-center gap-2.5 rounded-pill px-[18px] py-3 text-14 font-medium text-white shadow-pop",
          toast.err ? "bg-wine" : "bg-ink",
        )}
      >
        {toast.msg}
        {toast.action && (
          <button
            type="button"
            className="p-0 text-14 font-bold whitespace-nowrap text-butter"
            onClick={toast.onAction}
          >
            {toast.action}
          </button>
        )}
      </div>
    </div>
  );
}
