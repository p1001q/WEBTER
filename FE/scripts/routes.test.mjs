// lib/routes.ts 의 복귀 주소 검사를 확인한다. `pnpm test` 로 실행한다(Node 의 타입 제거 실행 사용, 별도 도구 없음).
import assert from "node:assert/strict";
import { test } from "node:test";
import { pathFor, safeBackPath } from "../src/lib/routes.ts";

test("정상적인 내부 경로와 쿼리는 그대로 돌려준다", () => {
  for (const ok of [
    "/",
    "/mypage",
    "/mypage?tab=saved",
    "/services/s01?tab=reviews",
    "/search?q=%ED%95%9C%EA%B8%80",
    "/login?back=%2Fservices%2Fs01",
    pathFor("detail", { id: "s01", tab: "reviews" }),
  ]) {
    assert.equal(safeBackPath(ok), ok, ok);
  }
});

test("외부 주소가 되는 입력은 막는다", () => {
  for (const bad of [
    undefined,
    "",
    "evil",
    "mypage",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "/\\\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "/\u0000/evil.example",
    "/ /evil.example",
    "/\u0085/evil.example",
    "https://evil.example",
    "http://evil.example/mypage",
    "javascript:alert(1)",
    "data:text/html,x",
  ]) {
    assert.equal(safeBackPath(bad), null, JSON.stringify(bad));
  }
});

test("막은 입력은 실제로 외부 출처가 되는 입력이다(재현)", () => {
  const origin = "http://webter.invalid";
  for (const attack of [
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "//evil.example",
  ]) {
    assert.notEqual(
      new URL(attack, origin).origin,
      origin,
      JSON.stringify(attack),
    );
  }
});
