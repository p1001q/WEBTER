import type { LinkKind } from "@/api/types";
import { LINK_LABEL } from "./options";

/** 프로필 링크의 저장 한도. https:// 를 보완한 주소를 기준으로 센다. */
export const PROFILE_LINK_MAX = 300;

export const normalizeLink = (url: string) => {
  const t = url.trim();
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(t) ? t : `https://${t}`;
};

const LINK_RULES: Record<
  LinkKind,
  { host: RegExp; path?: RegExp; example: string }
> = {
  github: {
    host: /^(www\.)?github\.com$/,
    path: /^\/[A-Za-z0-9-]+(\/|$)/,
    example: "github.com/아이디",
  },
  instagram: {
    host: /^(www\.)?instagram\.com$/,
    path: /^\/[\w.]+(\/|$)/,
    example: "instagram.com/아이디",
  },
  velog: {
    host: /^(www\.)?velog\.io$/,
    path: /^\/@[\w.-]+(\/|$)/,
    example: "velog.io/@아이디/posts",
  },
  notion: {
    host: /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.notion\.site$/,
    example: "workspace.notion.site/페이지",
  },
  naver_blog: {
    host: /^blog\.naver\.com$/,
    path: /^\/[A-Za-z0-9_-]+\/?$/,
    example: "blog.naver.com/아이디",
  },
  tistory: {
    host: /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.tistory\.com$/,
    example: "아이디.tistory.com",
  },
};

export function linkCheck(kind: LinkKind, value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const address = normalizeLink(text);
  if (address.length > PROFILE_LINK_MAX)
    return `주소는 https:// 를 포함해 ${PROFILE_LINK_MAX}자까지 입력할 수 있어요.`;
  const rule = LINK_RULES[kind];
  const format = `올바른 주소 형식이 아니에요. 예: ${rule.example}`;
  if (
    !/^https?:\/\/[a-z0-9.-]+(?::[0-9]+)?(?:[/?#]|$)/i.test(address) ||
    /[\s\\]/u.test(address)
  )
    return format;
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return format;
  }
  if (url.username || url.password || url.port) return format;
  if (
    !rule.host.test(url.hostname) ||
    (rule.path && !rule.path.test(url.pathname))
  )
    return `${LINK_LABEL[kind]} 주소만 입력할 수 있어요. 예: ${rule.example}`;
  return null;
}

type StoredLink = { kind: string; url: string };
const replacementKinds = ["notion", "naver_blog", "tistory"] as const;

/** 이전 블로그·포트폴리오 주소가 새 플랫폼 규칙에 맞으면 같은 주소로 이어 준다. */
export function mapProfileLinks(links: StoredLink[]): [LinkKind, string][] {
  const active = new Map<LinkKind, string>();
  for (const { kind, url } of links) {
    if (
      Object.hasOwn(LINK_RULES, kind) &&
      url.trim() &&
      !linkCheck(kind as LinkKind, url)
    )
      active.set(kind as LinkKind, url);
  }
  for (const { kind, url } of links) {
    if ((kind !== "blog" && kind !== "portfolio") || !url.trim()) continue;
    const replacement = replacementKinds.find(
      (candidate) => !linkCheck(candidate, url),
    );
    if (replacement && !active.has(replacement)) active.set(replacement, url);
  }
  return [...active];
}
