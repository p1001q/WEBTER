"use client";

import { useState } from "react";
import { FILTER_DEFAULT, type FilterState } from "@/domain/filter";
import { useWt } from "@/providers/context";

/**
 * 목록 화면의 필터·패널 열림·모바일 전용 보기 상태. 보기 방식(카드/목록)은 앱 상태를 따른다.
 * 주소의 쿼리가 바뀌면 화면을 `key` 로 새로 만들므로(보관본과 같다) 이 상태도 처음부터 다시 시작한다.
 */
export function useListState(
  initialCat?: string | null,
  opts: { filterOpen?: boolean } = {},
) {
  const wt = useWt();
  const [f, setF] = useState<FilterState>({
    ...FILTER_DEFAULT,
    cats: initialCat ? [initialCat] : [],
  });
  const [open, setOpen] = useState(!!opts.filterOpen);
  const [mobileOnly, setMobileOnly] = useState(true);
  return {
    f,
    setF,
    open,
    setOpen,
    mobileOnly,
    setMobileOnly,
    view: wt.view,
    setView: wt.setView,
  };
}
export type ListState = ReturnType<typeof useListState>;
