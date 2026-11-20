import { getJson } from "../auth/http";
import type { User } from "../types";

interface BackendMember {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string | null;
  bio: string;
}

export interface MemberSearchPage {
  items: User[];
  page: number;
  size: number;
  total: number;
}

export async function searchMembers(
  q: string,
  page = 0,
): Promise<MemberSearchPage> {
  const params = new URLSearchParams({ q, page: String(page), size: "20" });
  const result = await getJson<
    Omit<MemberSearchPage, "items"> & {
      items: BackendMember[];
    }
  >(`/api/users/search?${params}`);
  return {
    ...result,
    items: result.items.map((user) => ({
      id: user.id,
      nick: user.nickname,
      handle: user.username,
      avatarImg: user.avatarUrl ?? null,
      bio: user.bio ?? "",
      color: "#E3E8F0",
      links: [],
    })),
  };
}
