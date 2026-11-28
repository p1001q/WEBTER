import type { Metadata } from "next";
import { SITE_URL } from "./site";

export const SITE_TITLE = "WEBTER | 웹이 모이는 터, 웹터";
export const SITE_DESCRIPTION =
  "개발자가 만든 웹 서비스를 발견하고, 설치 없이 이용하며 리뷰와 반응을 나누는 웹 서비스 스토어.";

/** http(s) 절대 주소만 남긴다. 미리보기 이미지는 메신저가 직접 받아 가므로 상대 주소를 쓰지 않는다 */
export const absoluteUrl = (url: string | null | undefined) =>
  url && /^https?:\/\//i.test(url) ? url : null;

/** 공유 미리보기 기본 이미지(아이보리 배경 워드마크). 페이지에 고유 이미지가 없을 때 쓴다 */
export const DEFAULT_OG_IMAGE = {
  url: "/og-default.png",
  width: 1200,
  height: 630,
  alt: "WEBTER",
};

/**
 * 링크 공유 미리보기(OG·트위터 카드)를 만든다.
 * 이미지가 없으면 기본 이미지를 넣는다. og:image가 비면 메신저가 페이지 안의 다른 이미지를 대신 가져가기 때문이다.
 */
export function shareMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path?: string;
  /** 절대 주소 */
  image?: string | null;
}): Metadata {
  const ogImage = image ? { url: image } : DEFAULT_OG_IMAGE;
  return {
    ...(SITE_URL && path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: "website",
      siteName: "WEBTER",
      locale: "ko_KR",
      title,
      description,
      ...(SITE_URL && path ? { url: path } : {}),
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.url],
    },
  };
}
