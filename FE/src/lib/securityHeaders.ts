type PolicyOptions = {
  nonce: string;
  development: boolean;
  apiBase?: string;
  uploadOrigins?: string;
};

/** 설정값이 CSP 지시어를 추가하지 못하도록 HTTP(S) origin만 사용한다. */
function originOf(value: string, development: boolean): string {
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !((development || loopback) && url.protocol === "http:"))
  )
    throw new Error("CSP 연결 주소는 HTTPS origin이어야 합니다.");
  // URL 호스트에는 세미콜론 등이 남을 수 있다. CSP 구분자가 있으면 지시어가 추가되므로 거절한다.
  if (/[\s;,'"]/.test(url.origin))
    throw new Error("CSP 연결 주소에 허용하지 않는 문자가 있습니다.");
  return url.origin;
}

export function securityHeaders({
  nonce,
  development,
  apiBase,
  uploadOrigins,
}: PolicyOptions): Record<string, string> {
  if (!/^[A-Za-z0-9+/=_-]{22,}$/.test(nonce))
    throw new Error("CSP nonce 형식이 올바르지 않습니다.");
  const connections = new Set(["'self'", "data:", "blob:"]);
  if (apiBase) connections.add(originOf(apiBase, development));
  for (const value of (uploadOrigins ?? "").split(",").filter((v) => v.trim()))
    connections.add(originOf(value.trim(), development));
  if (development) {
    connections.add("ws:");
    connections.add("wss:");
  }
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    // 개발 HMR의 style 요소만 예외로 둔다. 운영 CSS·Next.js style 요소에는 nonce를 사용한다.
    `style-src 'self' ${development ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // 기존 React style 속성(이미지 맞춤·진행률 등)을 유지하되 script의 인라인 실행은 허용하지 않는다.
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' https: data: blob:${development ? " http:" : ""}`,
    "font-src 'self' data:",
    `connect-src ${[...connections].join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-src ${development ? "'self'" : "'none'"}`,
    `frame-ancestors ${development ? "'self'" : "'none'"}`,
  ];
  return {
    "Content-Security-Policy": directives.join("; "),
    "X-Frame-Options": development ? "SAMEORIGIN" : "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}
