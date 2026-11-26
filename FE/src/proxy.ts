import { NextRequest, NextResponse } from "next/server";
import { securityHeaders } from "./lib/securityHeaders";

/** 페이지 응답의 CSP는 여기서만 관리한다. 외부에서 받은 nonce·CSP는 덮어쓴다. */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(
    crypto.getRandomValues(new Uint8Array(16)),
  ).toString("base64");
  const policy = securityHeaders({
    nonce,
    development: process.env.NODE_ENV === "development",
    apiBase: process.env.NEXT_PUBLIC_API_BASE_URL,
    uploadOrigins: process.env.CSP_UPLOAD_ORIGINS,
  });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy["Content-Security-Policy"]);
  const response = NextResponse.next({ request: { headers } });
  for (const [key, value] of Object.entries(policy))
    response.headers.set(key, value);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
