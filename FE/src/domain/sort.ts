import type { Service } from "@/api/types";
import { scoreAll } from "./score";

/** 마이페이지 목록 정렬. 저장한 서비스는 popular 를 쓰지 않는다 */
export type MySort = "new" | "old" | "popular";

export const MINE_SORT_OPTIONS = [
  ["new", "최신순"],
  ["old", "과거순"],
  ["popular", "인기순"],
] as const;
export const SAVED_SORT_OPTIONS = [
  ["new", "최신순"],
  ["old", "과거순"],
] as const;

const byNewest = (a: Service, b: Service) => b.created.localeCompare(a.created);

/** 내 서비스 정렬 — 등록일 기준 최신순·과거순, 인기순은 기간 없이 전체 점수(R-METRIC) 기준 */
export function sortMine(list: Service[], sort: MySort): Service[] {
  const out = [...list];
  if (sort === "old") return out.sort((a, b) => byNewest(b, a));
  if (sort === "popular")
    return out.sort((a, b) => scoreAll(b) - scoreAll(a) || byNewest(a, b));
  return out.sort(byNewest);
}

/** 저장한 서비스 정렬 — `list` 는 담은 순서(먼저 담은 것이 앞)로 받는다 */
export function sortSaved(list: Service[], sort: "new" | "old"): Service[] {
  return sort === "new" ? [...list].reverse() : [...list];
}
