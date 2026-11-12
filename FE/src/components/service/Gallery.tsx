"use client";

import type { Service } from "@/api/types";
import { useWt } from "@/providers/context";
import { PreviewInner } from "./PreviewInner";
import { shotClass } from "./previewStyles";

/** 상세 화면의 미리보기 이미지 줄. 누르면 라이트박스로 크게 본다 */
export function Gallery({ s }: { s: Service }) {
  const wt = useWt();
  if (!s.previews || !s.previews.count) return null;
  const p = s.previews;
  const port = p.ratio === "port";
  return (
    <div
      className="flex gap-4 overflow-x-auto pt-8 pb-2 [scrollbar-width:thin]"
      aria-label="미리보기 이미지"
      data-component="gallery"
      data-ratio={p.ratio}
      data-fit={p.fit}
    >
      {Array.from({ length: p.count }).map((_, i) => (
        <button
          key={i}
          type="button"
          className={`${shotClass(port)} transition-[translate] duration-200 hover:-translate-y-[3px]`}
          aria-label={`미리보기 ${i + 1} 크게 보기`}
          onClick={() => wt.setModal({ type: "lightbox", sid: s.id, index: i })}
        >
          <PreviewInner s={s} i={i} />
        </button>
      ))}
    </div>
  );
}
