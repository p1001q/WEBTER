import { getJson } from "../auth/http";
import { mapProfileLinks } from "@/domain/profileLinks";
import type { User } from "../types";
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
  links: mapProfileLinks(p.links),
});

/** 프로필·마이페이지가 쓰는 서버 조회 */
export const profileApi = {
  profile: async (id: string) =>
    profileToUser(
      await getJson<BackendProfile>(`/api/users/${encodeURIComponent(id)}`),
    ),
  /** 내가 좋아요한 서비스 id */
  liked: () => getJson<string[]>("/api/users/me/liked"),
  /** 내가 저장한 서비스(저장한 순서, 먼저 저장한 것이 앞). 저장 뒤 비공개된 서비스는 이름과 공개 상태로 알아본다 */
  saved: () =>
    getJson<
      {
        serviceId: string;
        savedAt: string;
        name: string;
        visibility: "PUBLIC" | "TEMP_HIDDEN" | "HIDDEN";
      }[]
    >("/api/users/me/saved"),
  /** 내가 남긴 추천·비추천(목록 카드의 내 평가 표시용). written은 본문이 있는 리뷰인지 */
  ratings: () =>
    getJson<
      {
        serviceId: string;
        rate: "RECOMMEND" | "NOT_RECOMMEND";
        written: boolean;
      }[]
    >("/api/users/me/ratings"),
  myReviews: async () =>
    (await getJson<BackendReview[]>("/api/users/me/reviews")).map(mapReview),
  myComments: async () =>
    (await getJson<BackendComment[]>("/api/users/me/comments")).map(mapComment),
};
