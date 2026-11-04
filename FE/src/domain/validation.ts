import type { LinkKind } from "@/api/types";
import { LINK_LABEL } from "./options";
import { POLICY } from "./policy";
import { normalizeLink, PROFILE_LINK_MAX } from "./profileLinks";

export type FieldState = "idle" | "format" | "ok" | "taken";
/** 입력 검증 상태 → 메시지 색상 */
export const msgState = (s: FieldState): "ok" | "idle" | "err" =>
  s === "ok" ? "ok" : s === "idle" ? "idle" : "err";
export interface FieldCheck {
  state: FieldState;
  msg?: string;
}

/** 닉네임 길이 안내 — 입력칸 도움말과 길이 오류 메시지가 함께 쓴다 */
export const NICK_RULE_HINT = `한글은 2칸, 영문·숫자·공백은 1칸으로 세어 ${POLICY.nickMaxWeight}칸까지 입력할 수 있어요.`;

/* 서비스 주소 — R-URL. 형식 검사는 클라이언트, 접속·중복 검사는 서버(api.checkServiceUrl) */
const SOURCE_HOSTS = ["github.com", "gitlab.com", "bitbucket.org"];
export interface UrlFormatCheck {
  state: "idle" | "format" | "pass";
  msg?: string;
  source?: boolean;
  host?: string;
}
export function urlFormat(v: string): UrlFormatCheck {
  const t = v.trim();
  if (!t) return { state: "idle" };
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return {
      state: "format",
      msg: "올바른 주소 형식이 아니에요. https:// 로 시작하는 전체 주소를 입력하세요.",
    };
  }
  if (u.protocol !== "https:")
    return { state: "format", msg: "https 주소만 등록할 수 있어요." };
  const h = u.hostname.replace(/^www\./, "");
  if (SOURCE_HOSTS.includes(h))
    return {
      state: "format",
      msg: "배포된 주소를 입력하세요. GitHub 저장소 주소는 아래 GitHub 링크 칸에 입력할 수 있어요.",
      source: true,
    };
  return { state: "pass", host: h };
}
export const normUrl = (v: string) =>
  v.trim().replace(/\/+$/, "").toLowerCase();

export function githubCheck(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(t)
    ? null
    : "GitHub 저장소 주소만 입력할 수 있어요. 예: https://github.com/아이디/저장소";
}

/* 프로필 외부 링크 — 유형마다 주소 형식을 검사한다(포트폴리오는 검사하지 않는다). https:// 는 생략해도 된다 */
const LINK_RULES: Record<
  Exclude<LinkKind, "portfolio">,
  { host?: string; path?: RegExp; example: string }
> = {
  github: {
    host: "github.com",
    path: /^\/[A-Za-z0-9-]+(\/|$)/,
    example: "github.com/아이디",
  },
  velog: {
    host: "velog.io",
    path: /^\/@[\w.-]+(\/|$)/,
    example: "velog.io/@아이디",
  },
  instagram: {
    host: "instagram.com",
    path: /^\/[\w.]+(\/|$)/,
    example: "instagram.com/아이디",
  },
  blog: { example: "blog.example.com" },
};
export function linkCheck(kind: LinkKind, v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  if (normalizeLink(t).length > PROFILE_LINK_MAX)
    return `주소는 https:// 를 포함해 ${PROFILE_LINK_MAX}자까지 입력할 수 있어요.`;
  const rule = kind === "portfolio" ? undefined : LINK_RULES[kind];
  const format = `올바른 주소 형식이 아니에요. 예: ${rule?.example ?? "portfolio.example.com"}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) && !/^https?:\/\//i.test(t)) return format;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return format;
  }
  // 서버는 주소에 사용자 정보(user@)가 있으면 거절한다
  if (u.username || u.password) return format;
  // 포트폴리오는 호스트 규칙 없이 주소 형식만 검사한다
  if (!rule) return null;
  const host = u.hostname.replace(/^www\./, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) return format;
  if (!rule.host) return null;
  if (host !== rule.host || !rule.path?.test(u.pathname))
    return `${LINK_LABEL[kind]} 주소만 입력할 수 있어요. 예: ${rule.example}`;
  return null;
}

/* 아이디·닉네임 — R-ACCOUNT. takenHandles 는 서버 중복 확인을 대신하는 목록이다 */
export function handleCheck(
  v: string,
  takenHandles: string[],
  selfHandle?: string,
  opts: { required?: boolean } = {},
): FieldCheck {
  if (!v) {
    return opts.required
      ? { state: "format", msg: "아이디를 입력해 주세요." }
      : { state: "idle" };
  }
  const key = v.toLowerCase();
  if (!key.trim())
    return { state: "format", msg: "공백만으로는 만들 수 없어요." };
  if (/\s/.test(key))
    return { state: "format", msg: "아이디에는 공백을 쓸 수 없어요." };
  if (key.length < POLICY.idMin || key.length > POLICY.idMax)
    return {
      state: "format",
      msg: `${POLICY.idMin}~${POLICY.idMax}자로 입력하세요.`,
    };
  if (!/^[a-z0-9._]+$/.test(key))
    return {
      state: "format",
      msg: "영문·숫자·마침표(.)·밑줄(_)만 쓸 수 있어요.",
    };
  if (!/[a-z0-9]/.test(key))
    return {
      state: "format",
      msg: "기호만으로는 만들 수 없어요. 영문이나 숫자를 한 글자 이상 넣어 주세요.",
    };
  if (key.startsWith(".") || key.endsWith("."))
    return { state: "format", msg: "마침표(.)로 시작하거나 끝낼 수 없어요." };
  if (key.includes(".."))
    return { state: "format", msg: "마침표(.)를 연달아 쓸 수 없어요." };
  if (key !== selfHandle?.toLowerCase() && takenHandles.includes(key))
    return { state: "taken", msg: "이미 사용 중인 아이디예요." };
  return { state: "ok", msg: "사용할 수 있는 아이디예요." };
}
/** 닉네임 가중 길이: 완성형 한글(가~힣) 2칸, 그 밖의 문자 1칸. 허용 문자만 들어온 값에 쓴다 */
export function nickWeight(v: string): number {
  let w = 0;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    w += c >= 0xac00 && c <= 0xd7a3 ? POLICY.nickHangulWeight : 1;
  }
  return w;
}
export function nickCheck(
  v: string,
  opts: { required?: boolean } = {},
): FieldCheck {
  if (!v) {
    return opts.required
      ? { state: "format", msg: "닉네임을 입력해 주세요." }
      : { state: "idle" };
  }
  if (!v.trim())
    return { state: "format", msg: "공백만으로는 만들 수 없어요." };
  if (v !== v.trim())
    return { state: "format", msg: "앞뒤 공백은 쓸 수 없어요." };
  if (/\s{2,}/.test(v))
    return { state: "format", msg: "공백은 한 칸씩만 쓸 수 있어요." };
  if (!/^[가-힣A-Za-z0-9 ]+$/.test(v))
    return {
      state: "format",
      msg: "한글·영문·숫자와 중간 공백만 쓸 수 있어요. 자음·모음만 쓴 글자, 기호, 이모지는 쓸 수 없어요.",
    };
  const w = nickWeight(v);
  if (w < POLICY.nickMin || w > POLICY.nickMaxWeight)
    return {
      state: "format",
      msg: `너무 길어요(${w}칸). ${NICK_RULE_HINT}`,
    };
  return {
    state: "ok",
    msg: "좋은 닉네임이에요. 닉네임은 다른 사람과 같아도 돼요.",
  };
}

/** 아이디 변경 제한(인스타그램 방식 제안): 최근 N일 안에 M번까지 바꿀 수 있다 */
export function handleChangeStatus(
  changes: string[] | undefined,
  today: string,
) {
  const day = 24 * 60 * 60 * 1000;
  const t = new Date(today).getTime();
  const recent = (changes ?? [])
    .map((d) => new Date(d).getTime())
    .filter((c) => t - c < POLICY.handleChangeDays * day)
    .sort((x, y) => x - y);
  const left = Math.max(0, POLICY.handleChangeMax - recent.length);
  // 가장 오래된 변경이 기간을 벗어나면 다시 바꿀 수 있다
  const waitDays =
    left > 0 || !recent.length
      ? 0
      : Math.ceil((recent[0] + POLICY.handleChangeDays * day - t) / day);
  return { left, waitDays };
}

/* 이미지 파일 */
export function imageError(f: File): string | null {
  if (!(POLICY.imageTypes as readonly string[]).includes(f.type))
    return "JPG, PNG, WebP 파일만 올릴 수 있어요.";
  if (f.size > POLICY.imageMaxMB * 1024 * 1024)
    return `${POLICY.imageMaxMB}MB 이하의 이미지만 올릴 수 있어요. (선택한 파일 ${(f.size / 1048576).toFixed(1)}MB)`;
  return null;
}
export const readAsURL = (f: File) =>
  new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsDataURL(f);
  });
export const imgSize = (src: string) =>
  new Promise<[number, number]>((res) => {
    const i = new Image();
    i.onload = () => res([i.naturalWidth, i.naturalHeight]);
    i.onerror = () => res([0, 0]);
    i.src = src;
  });
