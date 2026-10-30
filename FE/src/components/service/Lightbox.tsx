"use client";

import { useEffect, useState } from "react";
import type { Service } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { PreviewInner } from "./PreviewInner";
import { shotClass } from "./previewStyles";

const darkIconButton = "bg-white/8! text-white! hover:bg-white/18!";

/** 미리보기를 크게 보는 화면. ←/→ 로 넘기고 Esc 로 닫는다 */
export function Lightbox({
  s,
  index,
  onClose,
}: {
  s: Service;
  index?: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(index || 0);
  const n = s.previews?.count ?? 0;
  const port = s.previews?.ratio === "port";
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => (x + 1) % n);
      if (e.key === "ArrowLeft") setI((x) => (x - 1 + n) % n);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [n, onClose]);
  return (
    <div
      className="fixed inset-0 z-[65] flex animate-fade flex-col items-center justify-center gap-4 bg-[rgb(20_20_20/0.92)] px-18 py-14"
      role="dialog"
      aria-modal="true"
      aria-label={`${s.name} 미리보기 확대`}
    >
      <IconButton
        className={`absolute top-4 right-4 ${darkIconButton}`}
        onClick={onClose}
        aria-label="닫기"
      >
        <Icon name="close" size={20} />
      </IconButton>
      <div className="flex max-h-full w-[min(100%,1100px)] justify-center">
        <div
          className={shotClass(port)}
          style={
            port
              ? { width: "min(360px, 40vh)" }
              : { width: "min(100%, calc((100dvh - 200px) * 16 / 9))" }
          }
        >
          <PreviewInner s={s} i={i} />
        </div>
      </div>
      <div className="flex items-center gap-4 font-mono text-12 text-white">
        <IconButton
          className={darkIconButton}
          aria-label="이전 이미지"
          onClick={() => setI((i - 1 + n) % n)}
        >
          <Icon name="chevLeft" />
        </IconButton>
        <span>
          {i + 1} / {n}
        </span>
        <IconButton
          className={darkIconButton}
          aria-label="다음 이미지"
          onClick={() => setI((i + 1) % n)}
        >
          <Icon name="chevRight" />
        </IconButton>
      </div>
    </div>
  );
}
