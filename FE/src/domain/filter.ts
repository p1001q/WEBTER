import type { Service } from "@/api/types";

export interface FilterState {
  cats: string[];
  type: string[];
  devices: string[];
  price: string[];
  owner: string[];
  langs: string[];
  use: string[];
}
export type FilterKey = keyof FilterState;

export const FILTER_DEFAULT: FilterState = {
  cats: [],
  type: [],
  devices: [],
  price: [],
  owner: [],
  langs: [],
  use: ["live"],
};

/** 필터 — 그룹 안은 OR, 그룹 간은 AND (제안) */
export function applyFilter(
  list: Service[],
  f: FilterState,
  mobileOnly: boolean,
): Service[] {
  return list.filter((s) => {
    if (f.cats.length && !s.cats.some((c) => f.cats.includes(c))) return false;
    if (f.type.length && !f.type.includes(s.type)) return false;
    if (f.devices.length && !s.devices.some((d) => f.devices.includes(d)))
      return false;
    if (f.price.length && !f.price.includes(s.price)) return false;
    if (f.owner.length && !f.owner.includes(s.team ? "team" : "solo"))
      return false;
    if (f.langs.length && !s.langs.some((l) => f.langs.includes(l)))
      return false;
    if (!f.use.includes(s.use)) return false;
    if (mobileOnly && !s.devices.includes("mobile")) return false;
    return true;
  });
}
export const filterCount = (f: FilterState) =>
  (["cats", "type", "devices", "price", "owner", "langs"] as const).reduce(
    (a, k) => a + f[k].length,
    0,
  ) + (f.use.length === 1 && f.use[0] === "live" ? 0 : 1);
