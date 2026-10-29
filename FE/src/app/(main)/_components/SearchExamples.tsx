"use client";

import { SEARCH_EXAMPLES } from "@/domain/options";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";

/** 검색 예시 문구. 누르면 그 문구로 검색한다 */
export function SearchExamples({
  align = "center",
}: {
  align?: "center" | "start";
}) {
  const wt = useWt();
  return (
    <div
      className={cx(
        "mt-4 flex flex-wrap gap-2 @max-[560px]/app:flex-nowrap @max-[560px]/app:justify-start @max-[560px]/app:overflow-x-auto @max-[560px]/app:[scrollbar-width:none]",
        align === "center" ? "justify-center" : "justify-start",
      )}
      aria-label="검색 예시"
    >
      {SEARCH_EXAMPLES.map((ex) => (
        <button
          key={ex}
          type="button"
          className="rounded-pill border border-border bg-card px-3 py-[5px] text-[13.5px] whitespace-nowrap text-text-3 hover:border-border-strong hover:text-ink"
          onClick={() => wt.go("search", { q: ex })}
        >
          {ex}
        </button>
      ))}
    </div>
  );
}
