import type { Metadata } from "next";
import { API_SERVER_BASE } from "../auth/config";
import {
  absoluteUrl,
  SITE_DESCRIPTION,
  shareMetadata,
} from "@/lib/shareMetadata";

/** 공유 미리보기에 쓰는 프로필 값 */
export interface ProfileMeta {
  nickname: string;
  username: string;
  bio: string;
  /** 프로필 사진. 절대 주소만 담는다 */
  avatarUrl: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 서버 렌더링에서 프로필 한 건의 닉네임·아이디·소개·사진을 읽는다.
 * 제재된 프로필은 서버가 사진·소개를 비워 주므로 기본 이미지·설명으로 나간다. 없는 사용자는 null 이다.
 */
export async function fetchProfileMeta(
  id: string,
): Promise<ProfileMeta | null> {
  if (!UUID.test(id)) return null;
  try {
    const res = await fetch(
      `${API_SERVER_BASE}/api/users/${encodeURIComponent(id)}`,
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        username: string;
        nickname: string;
        avatarUrl?: string | null;
        bio?: string | null;
      };
    };
    const p = body.success ? body.data : undefined;
    if (!p) return null;
    return {
      nickname: p.nickname,
      username: p.username,
      bio: p.bio?.trim() ?? "",
      avatarUrl: absoluteUrl(p.avatarUrl),
    };
  } catch {
    return null;
  }
}

/** 프로필 링크의 제목(닉네임 / @아이디)·설명(한 줄 소개)·이미지(프로필 사진) */
export function profileMetadata(id: string, meta: ProfileMeta): Metadata {
  const title = `${meta.nickname} / @${meta.username}`;
  const description = meta.bio || SITE_DESCRIPTION;
  return {
    title,
    description,
    ...shareMetadata({
      title,
      description,
      path: `/users/${id}`,
      image: meta.avatarUrl,
    }),
  };
}
