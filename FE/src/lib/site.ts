/**
 * 사이트의 공개 주소(NEXT_PUBLIC_SITE_URL, 예: https://webter.example). 공유 미리보기(OG)의 주소를 만들 때만 쓴다.
 * 값이 없거나 올바른 http(s) 주소가 아니면 null 이고, 이때는 주소 항목 없이 제목·소개·이미지만 낸다.
 */
function parseSiteUrl(raw: string | undefined): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export const SITE_URL = parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
