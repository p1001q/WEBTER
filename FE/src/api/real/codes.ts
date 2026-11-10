import type { CategoryId } from "../types";

/** 백엔드 카테고리 코드 ↔ 화면의 카테고리 id */
export const CODE_BY_ID: Record<CategoryId, string> = {
  play: "PLAY",
  life: "LIFE",
  learn: "LEARNING",
  prod: "PRODUCTIVITY",
  design: "DESIGN",
  util: "UTILITY",
  dev: "DEV_TOOLS",
  etc: "ETC",
};
export const ID_BY_CODE = Object.fromEntries(
  Object.entries(CODE_BY_ID).map(([id, code]) => [code, id as CategoryId]),
) as Record<string, CategoryId>;
