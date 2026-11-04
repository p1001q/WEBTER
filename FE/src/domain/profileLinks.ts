/** 프로필 링크의 저장 한도. https:// 를 보완한 주소를 기준으로 센다. */
export const PROFILE_LINK_MAX = 300;

export const normalizeLink = (url: string) => {
  const t = url.trim();
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(t) ? t : `https://${t}`;
};
