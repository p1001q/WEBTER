"use client";

import { useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";

export function SearchBar({
  initial = "",
  size,
  autoFocus,
}: {
  initial?: string;
  size?: "sm";
  autoFocus?: boolean;
}) {
  const wt = useWt();
  const [q, setQ] = useState(initial);
  const id = useId();
  // 주소의 검색어가 바뀌면(뒤로 가기 등) 입력칸도 따라간다
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setQ(initial);
  }
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) wt.go("search", { q: q.trim() });
  };
  const sm = size === "sm";
  return (
    <form
      className={cx(
        "flex items-center gap-3 rounded-pill border-[1.5px] border-ink bg-card pr-2 pl-6 focus-within:border-navy focus-within:shadow-[0_0_0_4px_var(--color-focus)] @max-[560px]/app:pl-[18px]",
        sm ? "h-[50px]" : "h-[60px] @max-[560px]/app:h-[52px]",
      )}
      onSubmit={submit}
      role="search"
    >
      <Icon name="search" size={20} className="text-muted" />
      <label htmlFor={id} className="sr-only">
        서비스 검색
      </label>
      <input
        id={id}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="어떤 웹 서비스를 찾고 계신가요?"
        autoFocus={autoFocus}
        className={cx(
          "min-w-0 flex-1 bg-transparent px-0.5 py-px text-ink outline-none placeholder:text-placeholder",
          sm ? "text-15" : "text-[17px] @max-[560px]/app:text-15",
        )}
      />
      <button
        className={cx(
          "grid shrink-0 place-items-center rounded-full border-0 bg-navy text-white hover:bg-navy-700",
          sm ? "size-9" : "size-11 @max-[560px]/app:size-[38px]",
        )}
        type="submit"
        aria-label="검색"
      >
        <Icon name="arrowRight" size={20} stroke={2} />
      </button>
    </form>
  );
}
