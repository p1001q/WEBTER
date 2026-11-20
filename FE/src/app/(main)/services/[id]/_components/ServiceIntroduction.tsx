"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { RouteLink } from "@/components/ui/RouteLink";
import { tagClass } from "@/components/ui/Tag";
import { cx } from "@/lib/cx";

/** 소개는 항상 표시하고, 실제 화면에서 7줄을 넘는 설명만 접는다. */
export function ServiceIntroduction({
  description,
  tags,
}: {
  description: string;
  tags: string[];
}) {
  const contentId = useId();
  const content = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const element = content.current;
    if (!element) return;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      const lineHeight = Number.parseFloat(
        getComputedStyle(element).lineHeight,
      );
      setOverflow(element.scrollHeight > lineHeight * 7 + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // 첫 배치와 웹폰트 적용 후에도 줄 수를 다시 확인한다.
    const frame = requestAnimationFrame(measure);
    document.fonts.ready.then(measure);
    return () => {
      alive = false;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [description]);
  return (
    <section className="mb-8" aria-label="서비스 소개">
      <h2 className="mb-4 text-18 font-bold">소개</h2>
      <p
        ref={content}
        id={contentId}
        className={cx(
          "m-0 text-[15.5px] leading-[1.75] break-words text-pretty whitespace-pre-line",
          description ? "text-[#3a3a3a]" : "text-muted",
          !expanded && "line-clamp-7",
        )}
      >
        {description || "상세 설명이 아직 없어요."}
      </p>
      {overflow && (
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1 text-14 font-semibold text-muted hover:text-ink"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "접기" : "더보기"}
          <Icon name={expanded ? "chevUp" : "chevDown"} size={16} />
        </button>
      )}
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5" aria-label="태그">
          {tags.map((tag) => (
            <RouteLink
              key={tag}
              to="search"
              params={{ q: tag }}
              className={tagClass}
            >
              #{tag}
            </RouteLink>
          ))}
        </div>
      )}
    </section>
  );
}
