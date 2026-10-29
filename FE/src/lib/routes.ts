/** 화면 이름 ↔ URL 경로 대응. 화면 코드는 이름과 파라미터로만 이동하고, URL 생성 규칙은 여기서만 안다. */
export type RouteName =
  | "home"
  | "trending"
  | "popular"
  | "latest"
  | "search"
  | "opensource"
  | "detail"
  | "profile"
  | "login"
  | "onboarding"
  | "register"
  | "edit"
  | "registered"
  | "manage"
  | "mypage"
  | "terms"
  | "privacy";

export type RouteParams = Record<string, string | undefined>;

/** 위에서부터 매칭한다. `/services/new` 가 `/services/:id` 보다 먼저 와야 한다. */
export const ROUTE_PATHS: [RouteName, string][] = [
  ["home", "/"],
  ["trending", "/trending"],
  ["popular", "/popular"],
  ["latest", "/latest"],
  ["search", "/search"],
  ["opensource", "/opensource"],
  ["register", "/services/new"],
  ["edit", "/services/:id/edit"],
  ["registered", "/services/:id/registered"],
  ["detail", "/services/:id"],
  ["profile", "/users/:id"],
  ["login", "/login"],
  ["onboarding", "/onboarding"],
  ["manage", "/manage"],
  ["mypage", "/mypage"],
  ["terms", "/terms"],
  ["privacy", "/privacy"],
];

/** 로그인해야 볼 수 있는 화면 */
export const AUTH_ONLY: ReadonlySet<RouteName> = new Set([
  "register",
  "edit",
  "registered",
  "manage",
  "mypage",
]);

const compiled = ROUTE_PATHS.map(([name, pattern]) => ({
  name,
  re: new RegExp("^" + pattern.replace(/:\w+/g, "[^/]+") + "/?$"),
}));

const query = (params: RouteParams) =>
  Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`,
    )
    .join("&");

export function pathFor(name: RouteName, params: RouteParams = {}): string {
  const pattern = ROUTE_PATHS.find(([n]) => n === name)![1];
  const rest = { ...params };
  const path = pattern.replace(/:(\w+)/g, (_, k: string) => {
    const v = rest[k];
    delete rest[k];
    return encodeURIComponent(v ?? "");
  });
  const q = query(rest);
  return path + (q ? "?" + q : "");
}

/** 현재 경로(쿼리 제외)의 화면 이름. 표에 없는 경로는 null */
export function routeNameOf(pathname: string): RouteName | null {
  return compiled.find((c) => c.re.test(pathname))?.name ?? null;
}

const ORIGIN_PROBE = "http://webter.invalid";

/**
 * 로그인·가입 뒤 돌아갈 주소는 앱 내부 경로만 허용한다.
 * 브라우저는 `\` 를 `/` 로, 탭·줄바꿈 같은 제어문자는 무시하고 해석하므로
 * `/\evil.example`, `/\t/evil.example` 처럼 겉보기에는 내부 경로인 입력도 외부 주소가 된다.
 * 그래서 `/` 로 시작하되 `//` 로 시작하지 않고, 백슬래시·제어문자·공백이 없으며,
 * 실제로 해석해도 같은 출처에 남는 값만 돌려준다.
 */
export function safeBackPath(back: string | undefined): string | null {
  if (!back || !back.startsWith("/") || back.startsWith("//")) return null;
  if (/[\\\u0000-\u0020\u007f-\u009f]/.test(back)) return null;
  try {
    return new URL(back, ORIGIN_PROBE).origin === ORIGIN_PROBE ? back : null;
  } catch {
    return null;
  }
}
