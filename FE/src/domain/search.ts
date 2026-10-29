import type { Service } from "@/api/types";

/** 자연어 판별 — 목업 규칙(제안): 공백으로 나뉜 어절이 3개 이상이거나 문장형 어미로 끝나면 자연어로 본다 */
export function isNatural(q: string): boolean {
  const t = q.trim();
  if (!t) return false;
  return (
    t.split(/\s+/).length >= 3 ||
    (/(싶어|싶은|줘|주는|하는|있는|사이트|서비스|도구|게임|찾아)$/.test(t) &&
      t.split(/\s+/).length >= 2)
  );
}

export interface KeywordHit {
  s: Service;
  score: number;
}
export function keywordSearch(services: Service[], q: string): KeywordHit[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return services
    .map((s) => {
      const name = s.name.toLowerCase(),
        tl = (s.tagline + " " + s.desc).toLowerCase(),
        tg = s.tags.join(" ").toLowerCase();
      let score = 0;
      words.forEach((w) => {
        if (name.includes(w)) score += 3;
        if (tg.includes(w)) score += 2;
        if (tl.includes(w)) score += 1;
      });
      return { s, score };
    })
    .filter((x) => x.score > 0);
}
