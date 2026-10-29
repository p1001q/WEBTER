"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  width?: number;
  labelledBy?: string;
}

/** 가운데 모달 틀. 배경 클릭·Esc·닫기 버튼으로 닫고, 열릴 때 첫 입력·버튼으로 포커스를 옮긴다 */
export function Modal({ onClose, children, width, labelledBy }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.activeElement as HTMLElement | null;
    ref.current
      ?.querySelector<HTMLElement>(
        "input, textarea, button:not([data-modal-close])",
      )
      ?.focus();
    return () => {
      window.removeEventListener("keydown", h);
      // 닫히면 열기 전에 포커스가 있던 곳으로 돌려 놓는다
      prev?.focus?.();
    };
    // 열릴 때 한 번만 포커스를 옮기고 키 핸들러를 건다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        className="absolute inset-0 w-full animate-fade cursor-default border-0 bg-scrim p-0"
        aria-label="닫기"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        className="relative max-h-[calc(100%-20px)] w-full max-w-[440px] animate-pop overflow-y-auto rounded-lg bg-card p-7 shadow-pop @max-[560px]/app:px-5 @max-[560px]/app:py-6 [&_h3]:mb-2 [&_h3]:pr-8 [&_h3]:text-20 [&_h3]:font-extrabold [&_h3]:tracking-[-0.02em] [&_p]:text-[14.5px] [&_p]:text-text-2"
        ref={ref}
        style={width ? { maxWidth: width } : undefined}
      >
        <IconButton
          data-modal-close
          className="absolute top-3.5 right-3.5"
          onClick={onClose}
          aria-label="닫기"
        >
          <Icon name="close" size={18} />
        </IconButton>
        {children}
      </div>
    </div>
  );
}
