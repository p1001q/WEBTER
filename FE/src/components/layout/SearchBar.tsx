"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";

export function SearchBar({
  initial = "",
  size,
  autoFocus,
  onActivate,
}: {
  initial?: string;
  size?: "sm";
  autoFocus?: boolean;
  onActivate?: () => void;
}) {
  const wt = useWt();
  const [q, setQ] = useState(initial);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  // 주소의 검색어가 바뀌면(뒤로 가기 등) 입력칸도 따라간다
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setQ(initial);
  }
  const submit = (e: FormEvent) => {
    e.preventDefault();
    wt.go("search", q.trim() ? { q: q.trim() } : {});
  };
  const sm = size === "sm";
  return (
    <form
      className={cx(
        "flex min-w-0 items-center gap-3 rounded-pill border-[1.5px] border-ink bg-card pr-1 pl-5 transition-[border-color,box-shadow] duration-200 focus-within:border-navy focus-within:shadow-[0_0_0_4px_var(--color-focus)] @max-[560px]/app:pl-[18px]",
        sm ? "h-[50px]" : "h-[60px] @max-[560px]/app:h-[52px]",
      )}
      onSubmit={submit}
      role="search"
      onClick={(event) => {
        if (!(event.target as Element).closest("button"))
          input.current?.focus();
      }}
    >
      <Icon name="search" size={20} className="text-muted" />
      <label htmlFor={id} className="sr-only">
        서비스·회원 검색
      </label>
      <input
        id={id}
        ref={input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="서비스, 회원 아이디·닉네임 검색"
        autoFocus={autoFocus}
        onFocus={onActivate}
        className={cx(
          "min-w-0 flex-1 bg-transparent px-0.5 py-px text-ink outline-none placeholder:text-placeholder",
          sm
            ? "text-15 @max-[560px]/app:text-16"
            : "text-[17px] @max-[560px]/app:text-16",
        )}
      />
      <button
        className={cx(
          "grid shrink-0 place-items-center rounded-full border-0 bg-navy text-white hover:bg-navy-700",
          "size-11",
        )}
        type="submit"
        aria-label="검색"
      >
        <Icon name="arrowRight" size={20} stroke={2} />
      </button>
    </form>
  );
}
