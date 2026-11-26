"use client";

import { useRef } from "react";
import { useWt } from "@/providers/context";
import { Icon } from "./Icon";

/** 프로필의 아이디를 복사한다. 화면의 @ 표시는 복사 문자열에서 제외한다. */
export function CopyHandle({ handle }: { handle: string }) {
  const wt = useWt();
  const copying = useRef(false);
  const copy = async () => {
    if (copying.current) return;
    copying.current = true;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(handle);
      } else {
        // Clipboard API가 없는 환경에서는 기존 링크 복사와 같은 방식으로 처리한다.
        const previous = document.activeElement as HTMLElement | null;
        const field = document.createElement("textarea");
        field.value = handle;
        field.readOnly = true;
        field.style.position = "fixed";
        field.style.left = "-9999px";
        try {
          document.body.appendChild(field);
          field.select();
          if (!document.execCommand("copy")) throw new Error("Copy failed");
        } finally {
          field.remove();
          previous?.focus({ preventScroll: true });
        }
      }
      wt.toast("아이디를 복사했어요.");
    } catch {
      wt.toast("아이디를 복사하지 못했어요. 다시 시도해 주세요.", {
        err: true,
      });
    } finally {
      copying.current = false;
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="아이디 복사"
      aria-label={`아이디 ${handle} 복사`}
      className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-sm font-mono text-14 font-medium text-muted hover:text-ink"
    >
      <span className="truncate">@{handle}</span>
      <Icon name="copy" size={14} className="shrink-0" />
    </button>
  );
}
