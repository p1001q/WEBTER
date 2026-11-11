import { getJson } from "../auth/http";
import type { LinkKind, User } from "../types";
import { mapComment, mapReview } from "./interactionApi";

type BackendReview = Parameters<typeof mapReview>[0];
type BackendComment = Parameters<typeof mapComment>[0];

/** 제작자 프로필(GET /api/users/{id}). 이메일 등 비공개 항목은 없다 */
interface BackendProfile {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string | null;
  bio: string;
  links: { kind: string; url: string }[];
  serviceCount: number;
  receivedLikes: number;
  moderated: boolean;
}

export const profileToUser = (p: BackendProfile): User => ({
  id: p.id,
  nick: p.nickname,
  handle: p.username,
  color: "#E3E8F0",
  bio: p.bio ?? "",
  avatarImg: p.avatarUrl ?? null,
  profileModerated: p.moderated,
  links: p.links.map((l): [LinkKind, string] => [l.kind as LinkKind, l.url]),
});

/** 프로필·마이페이지가 쓰는 서버 조회 */
export const profileApi = {
  profile: async (id: string) =>
    profileToUser(
      await getJson<BackendProfile>(`/api/users/${encodeURIComponent(id)}`),
    ),
  /** 내가 좋아요한 서비스 id */
  liked: () => getJson<string[]>("/api/users/me/liked"),
  /** 내가 저장한 서비스(저장한 순서, 먼저 저장한 것이 앞) */
  saved: () =>
    getJson<{ serviceId: string; savedAt: string }[]>("/api/users/me/saved"),
  myReviews: async () =>
    (await getJson<BackendReview[]>("/api/users/me/reviews")).map(mapReview),
  myComments: async () =>
    (await getJson<BackendComment[]>("/api/users/me/comments")).map(mapComment),
};
