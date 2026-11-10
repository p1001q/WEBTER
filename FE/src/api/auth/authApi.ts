import type { CategoryId, LinkKind, PolicyVersion, User } from "../types";
import { CODE_BY_ID, ID_BY_CODE } from "../real/codes";
import { API_BASE } from "./config";
import { deleteJson, getJson, postJson, putJson } from "./http";

export interface BackendMember {
  id: string;
  username: string;
  nickname: string;
  email: string | null;
  bio: string;
  links: { kind: string; url: string }[];
  role: "USER" | "ADMIN";
  accountStatus: string;
  interests: string[];
}

/** 로그인 상태. ANONYMOUS(로그인 안 함), SIGNUP_PENDING(구글 인증만 마침, 온보딩 필요), MEMBER(가입 완료) */
export type BackendSession =
  | { status: "ANONYMOUS"; pending: null; member: null }
  | { status: "SIGNUP_PENDING"; pending: { email: string }; member: null }
  | { status: "MEMBER"; pending: null; member: BackendMember };

export function memberToUser(m: BackendMember): User {
  return {
    id: m.id,
    nick: m.nickname,
    handle: m.username,
    color: "#E3E8F0",
    bio: m.bio ?? "",
    email: m.email ?? undefined,
    links: m.links.map((l): [LinkKind, string] => [l.kind as LinkKind, l.url]),
    interests: m.interests.flatMap((c) =>
      ID_BY_CODE[c] ? [ID_BY_CODE[c]] : [],
    ),
  };
}

export const fetchSession = () => getJson<BackendSession>("/api/auth/session");

export const fetchCurrentPolicies = () =>
  getJson<PolicyVersion[]>("/api/policies/current");

export async function checkUsername(username: string): Promise<boolean> {
  const r = await getJson<{ available: boolean }>(
    `/api/auth/username-available?username=${encodeURIComponent(username)}`,
  );
  return r.available;
}

/** 가입에 필요한 동의 문서 */
const REQUIRED_CONSENTS = ["TERMS", "PRIVACY", "AGE_CONFIRMATION"];

export async function submitSignup(input: {
  handle: string;
  nick: string;
  interests: CategoryId[];
  consents: PolicyVersion[];
}): Promise<BackendMember> {
  const session = await postJson<BackendSession>("/api/auth/signup", {
    username: input.handle.toLowerCase(),
    nickname: input.nick,
    interests: input.interests.map((id) => CODE_BY_ID[id]),
    consents: input.consents
      .filter((c) => REQUIRED_CONSENTS.includes(c.documentType))
      .map(({ documentType, version }) => ({ documentType, version })),
  });
  if (session.status !== "MEMBER")
    throw new Error("가입 결과를 확인하지 못했어요.");
  return session.member;
}

/** 계정 설정 저장. 편집 항목 전체를 보내며 링크·관심 카테고리는 보낸 목록으로 바뀐다 */
export async function submitProfile(u: User): Promise<BackendMember> {
  return putJson<BackendMember>("/api/users/me", {
    username: u.handle.toLowerCase(),
    nickname: u.nick,
    bio: u.bio,
    links: u.links.map(([kind, url]) => ({ kind, url })),
    interests: (u.interests ?? []).map((id) => CODE_BY_ID[id]),
  });
}

/** 회원 탈퇴. 서버가 계정과 이 세션을 함께 지운다 */
export const submitWithdraw = () => deleteJson<null>("/api/users/me");

export const submitLogout = () => postJson<null>("/api/auth/logout");

/** 구글 로그인을 시작하는 백엔드 주소. 로그인 뒤에는 `returnTo` 로 돌아온다 */
export const googleLoginUrl = (returnTo: string) =>
  `${API_BASE}/api/auth/login/google?returnTo=${encodeURIComponent(returnTo)}`;
