import type { Metadata } from "next";
import { API_SERVER_BASE } from "../auth/config";
import { SITE_URL } from "@/lib/site";

/** 공유 미리보기에 쓰는 서비스 값 */
export interface ServiceMeta {
  name: string;
  tagline: string;
  /** 썸네일, 없으면 아이콘. 절대 주소만 담는다 */
  image: string | null;
}

const absolute = (url: string | null | undefined) =>
  url && /^https?:\/\//i.test(url) ? url : null;

/**
 * 서버 렌더링에서 공개 서비스 한 건의 이름·소개·이미지를 읽는다.
 * 비공개·임시 비공개 서비스는 로그인 없이 보면 서버가 404를 주므로 null 이다(정보가 미리보기로 새지 않는다).
 */
export async function fetchServiceMeta(
  id: string,
): Promise<ServiceMeta | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  try {
    const res = await fetch(`${API_SERVER_BASE}/api/services/${id}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        name: string;
        tagline: string;
        thumbnailUrl: string | null;
        iconUrl: string | null;
        visibility: string;
      };
    };
    const s = body.success ? body.data : undefined;
    if (!s || s.visibility !== "PUBLIC") return null;
    return {
      name: s.name,
      tagline: s.tagline,
      image: absolute(s.thumbnailUrl) ?? absolute(s.iconUrl),
    };
  } catch {
    return null;
  }
}

/** 서비스 상세 링크의 제목·설명·OG·트위터 카드 */
export function serviceMetadata(id: string, meta: ServiceMeta): Metadata {
  const images = meta.image ? [{ url: meta.image }] : undefined;
  const path = `/services/${id}`;
  return {
    title: meta.name,
    description: meta.tagline,
    ...(SITE_URL ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: "website",
      siteName: "WEBTER",
      locale: "ko_KR",
      title: meta.name,
      description: meta.tagline,
      ...(SITE_URL ? { url: path } : {}),
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: meta.name,
      description: meta.tagline,
      images: meta.image ? [meta.image] : undefined,
    },
  };
}
