import type { User } from "@/api/types";

/** 서버 없는 화면 미리보기의 회원 검색. 서버와 같은 우선순위와 @ 처리를 쓴다. */
export function memberKeywordSearch(users: User[], query: string): User[] {
  const q = query.trim().replace(/^@/, "").trim().toLowerCase();
  if (!q) return [];
  const rank = (u: User) => {
    const id = u.handle.toLowerCase();
    const nick = u.nick.toLowerCase();
    return id === q
      ? 0
      : nick === q
        ? 1
        : id.startsWith(q)
          ? 2
          : nick.startsWith(q)
            ? 3
            : 4;
  };
  return users
    .filter(
      (u) =>
        !u.profileModerated &&
        (u.handle.toLowerCase().includes(q) ||
          u.nick.toLowerCase().includes(q)),
    )
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.handle.toLowerCase().localeCompare(b.handle.toLowerCase()) ||
        a.id.localeCompare(b.id),
    );
}
