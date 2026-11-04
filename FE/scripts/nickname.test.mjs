import assert from "node:assert/strict";
import { test } from "node:test";
import { harness } from "./helpers/uiHarness.mjs";

const { nickCheck, nickWeight } = harness().load("domain/validation.ts");
const ok = (v) => nickCheck(v, { required: true }).state === "ok";

test("닉네임 가중 길이: 완성형 한글 2칸, 영문·숫자·공백 1칸", () => {
  assert.equal(nickWeight("사과먹는 개발자"), 15);
  assert.equal(nickWeight("사과먹는 개발자님"), 17);
  assert.equal(nickWeight("사과먹는개발자님"), 16);
  assert.equal(nickWeight("가"), 2);
  assert.equal(nickWeight("a"), 1);
  assert.equal(nickWeight("7"), 1);
  assert.equal(nickWeight("한글자abcdefgh"), 14);
});

test("닉네임 허용: 한 글자, 16칸 경계, 한글·영문·숫자 혼용, 중간 단일 공백", () => {
  for (const v of [
    "가",
    "a",
    "7",
    "사과먹는 개발자",
    "사과먹는개발자님",
    "가".repeat(8),
    "a".repeat(16),
    "가나다라abcdefgh",
    "Mixed 닉네임 99",
  ])
    assert.ok(ok(v), `허용되어야 함: ${v}`);
});

test("닉네임 거부: 16칸 초과", () => {
  for (const v of [
    "사과먹는 개발자님",
    "가".repeat(9),
    "a".repeat(17),
    "가나다라abcdefghi",
  ]) {
    const r = nickCheck(v, { required: true });
    assert.equal(r.state, "format", `거부되어야 함: ${v}`);
    assert.match(r.msg, /칸/);
  }
});

test("닉네임 거부: 공백 규칙, 초성·모음, 기호, 이모지, 탭·줄바꿈", () => {
  for (const v of [
    " ",
    " 앞공백",
    "뒷공백 ",
    "두  칸",
    "ㅋㅋ",
    "ㅏㅏ",
    "개발ㅋㅋ",
    "기호!",
    "이모지😀",
    "탭\t포함",
    "줄\n바꿈",
    "full　width",
  ])
    assert.equal(
      nickCheck(v, { required: true }).state,
      "format",
      `거부되어야 함: ${JSON.stringify(v)}`,
    );
});

test("닉네임 빈 값: 필수가 아니면 idle, 필수면 안내", () => {
  assert.equal(nickCheck("").state, "idle");
  assert.equal(nickCheck("", { required: true }).state, "format");
});
