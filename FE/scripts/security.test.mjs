import assert from "node:assert/strict";
import { test } from "node:test";
import { harness } from "./helpers/uiHarness.mjs";

const { securityHeaders } = harness().load("lib/securityHeaders.ts");
const nonce = Buffer.alloc(16, 1).toString("base64");

test("운영 CSP는 요청 nonce만 인라인 script에 허용하고 프레임 삽입을 차단한다", () => {
  const headers = securityHeaders({
    nonce,
    development: false,
    apiBase: "https://api.example.test/api",
    uploadOrigins: "https://upload.example.test",
  });
  const csp = headers["Content-Security-Policy"];
  const script = csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith("script-src"));
  assert.match(script, new RegExp(`nonce-${nonce}`));
  assert.doesNotMatch(script, /unsafe-inline|unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(
    csp,
    /connect-src 'self' data: blob: https:\/\/api.example.test https:\/\/upload.example.test/,
  );
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
});

test("개발 도구의 같은 출처 iframe과 HMR 연결만 개발 예외로 둔다", () => {
  const headers = securityHeaders({
    nonce,
    development: true,
    apiBase: "http://localhost:8080",
  });
  assert.equal(headers["X-Frame-Options"], "SAMEORIGIN");
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'self'/);
  assert.match(headers["Content-Security-Policy"], /unsafe-eval/);
});

test("설정값·nonce로 CSP를 삽입하거나 운영에 비보안 연결 주소를 넣을 수 없다", () => {
  for (const uploadOrigins of [
    "https://good.example;script-src *",
    "javascript:alert(1)",
    "http://upload.example.test",
    "https://user:password@example.test",
  ])
    assert.throws(() =>
      securityHeaders({ nonce, development: false, uploadOrigins }),
    );
  assert.throws(() =>
    securityHeaders({ nonce: "bad'; script-src *", development: false }),
  );
});
