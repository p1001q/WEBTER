import { POLICY } from "./policy";

export type FieldState = "idle" | "format" | "ok" | "taken";
export interface FieldCheck {
  state: FieldState;
  msg?: string;
}

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

/* 아이디·닉네임 — R-ACCOUNT. takenHandles 는 서버 중복 확인을 대신하는 목록이다 */
export function handleCheck(
  v: string,
  takenHandles: string[],
  selfHandle?: string,
): FieldCheck {
  if (!v) return { state: "idle" };
  if (v.length > POLICY.idMax || !/^[A-Za-z0-9._]+$/.test(v))
    return {
      state: "format",
      msg: `영문·숫자·마침표(.)·밑줄(_)만, 공백 없이 ${POLICY.idMax}자까지 쓸 수 있어요.`,
    };
  if (v !== selfHandle && takenHandles.includes(v.toLowerCase()))
    return { state: "taken", msg: "이미 사용 중인 아이디예요." };
  return { state: "ok", msg: "사용할 수 있는 아이디예요." };
}
export function nickCheck(v: string): FieldCheck {
  if (!v) return { state: "idle" };
  if (v !== v.trim())
    return { state: "format", msg: "앞뒤 공백은 쓸 수 없어요." };
  if (v.length < POLICY.nickMin || v.length > POLICY.nickMax)
    return {
      state: "format",
      msg: `${POLICY.nickMin}~${POLICY.nickMax}자로 입력하세요.`,
    };
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 ]+$/.test(v))
    return { state: "format", msg: "한글·영문·숫자·중간 공백만 쓸 수 있어요." };
  return {
    state: "ok",
    msg: "좋은 닉네임이에요. 닉네임은 다른 사람과 같아도 돼요.",
  };
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
