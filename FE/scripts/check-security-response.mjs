import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

// 목업 모드의 프로덕션 빌드를 실행해 Next.js가 CSP nonce를 실제 HTML에 적용하는지 검사한다.
const socket = createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
socket.close();
await once(socket, "close");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    stdio: "ignore",
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: "",
      API_INTERNAL_BASE_URL: "",
      CSP_UPLOAD_ORIGINS: "http://localhost:9000",
    },
  },
);
const origin = `http://127.0.0.1:${port}`;

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error("프로덕션 서버 실행 실패");
    try {
      const response = await fetch(origin, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* 서버 시작 대기 */
    }
    await delay(100);
  }
  assert.ok(ready, "서버 시작 시간 초과");
  const nonces = [];
  for (let i = 0; i < 2; i++) {
    const response = await fetch(origin, {
      headers: {
        "x-nonce": "client-supplied-nonce",
        "content-security-policy": "script-src *",
      },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const csp = response.headers.get("content-security-policy");
    assert.match(csp, /frame-ancestors 'none'/);
    assert.doesNotMatch(csp, /script-src[^;]*(?:unsafe-inline|unsafe-eval)/);
    const nonce = csp.match(/'nonce-([^']+)'/)[1];
    assert.notEqual(nonce, "client-supplied-nonce");
    nonces.push(nonce);
    assert.match(response.headers.get("cache-control"), /private.*no-store/);
    const html = await response.text();
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)];
    assert.ok(scripts.length > 0);
    for (const [, attributes] of scripts)
      assert.ok(
        attributes.includes(`nonce="${nonce}"`),
        "script와 응답 CSP의 nonce 불일치",
      );
  }
  assert.notEqual(nonces[0], nonces[1], "요청별 nonce 재사용");
  const payload = "<img src=x onerror=alert(1)>";
  const html = await (
    await fetch(`${origin}/search?q=${encodeURIComponent(payload)}`)
  ).text();
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(!html.includes(payload));
  const missing = await fetch(`${origin}/not-found.png`);
  assert.equal(missing.headers.get("x-frame-options"), "DENY");
  console.log(
    "프로덕션 보안 응답 검증 통과: 헤더·요청별 nonce·HTML 적용·검색 이스케이프·404 보호",
  );
} finally {
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await Promise.race([exited, delay(3000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
