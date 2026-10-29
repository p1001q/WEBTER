import { CATEGORIES } from "@/domain/options";
import type { CategoryId } from "@/api/types";

type Raw = string | string[] | undefined;

/** 쿼리 값(문자열 또는 배열)의 첫 값 */
export const firstParam = (v: Raw): string | undefined =>
  Array.isArray(v) ? v[0] : v;

/** 허용된 값만 돌려주고 그 밖의 값은 undefined */
export function oneOf<T extends string>(
  v: Raw,
  allowed: readonly T[],
): T | undefined {
  const x = firstParam(v);
  return allowed.find((a) => a === x);
}

/** `?cat=` 값이 실제 카테고리일 때만 돌려준다 */
export const categoryParam = (v: Raw): CategoryId | undefined =>
  oneOf(
    v,
    CATEGORIES.map((c) => c.id),
  );
