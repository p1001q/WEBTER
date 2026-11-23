import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { harness } from "./helpers/uiHarness.mjs";

const h = harness();
const { nickCheck } = h.load("domain/validation.ts");
const { NICKNAME_PREFIXES, generateNickname } = h.load("domain/nickname.ts");
const ok = (v) => nickCheck(v, { required: true }).state === "ok";

test("닉네임 허용: 한 글자부터 공백 포함 9글자까지 문자 종류와 무관하게 허용", () => {
  for (const v of [
    "가",
    "a",
    "7",
    "사과먹는 개발자",
    "사과먹는개발자님",
    "사과먹는 개발자님",
    "가".repeat(9),
    "a".repeat(9),
    "ABC 가나다12",
    "싱글벙글 주인장",
  ])
    assert.ok(ok(v), `허용되어야 함: ${v}`);
});

test("닉네임 거부: 공백 포함 10글자부터 거부", () => {
  for (const v of [
    "사과먹는 개발자님요",
    "가".repeat(10),
    "a".repeat(10),
    "abcde 가나다라",
  ]) {
    const r = nickCheck(v, { required: true });
    assert.equal(r.state, "format", `거부되어야 함: ${v}`);
    assert.match(r.msg, /공백 포함 9글자/);
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

test("자동 닉네임은 확정한 60개 표현이고 실제 서버 목록과 일치한다", () => {
  assert.equal(NICKNAME_PREFIXES.length, 60);
  assert.equal(new Set(NICKNAME_PREFIXES).size, 60);
  for (const prefix of NICKNAME_PREFIXES) {
    assert.ok(prefix.length <= 4);
    assert.ok(ok(`${prefix} 주인장`));
  }
  const java = readFileSync(
    new URL(
      "../../BE/src/main/java/com/webter/domain/user/validation/NicknamePolicy.java",
      import.meta.url,
    ),
    "utf8",
  );
  const list = java.split("PREFIXES = List.of(")[1].split(");")[0];
  assert.deepEqual(
    [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]),
    [...NICKNAME_PREFIXES],
  );
  const allowed = new Set(NICKNAME_PREFIXES.map((p) => `${p} 주인장`));
  for (let i = 0; i < 100; i++) assert.ok(allowed.has(generateNickname()));
});

test("로컬 가입도 빈 닉네임만 주인장 이름으로 생성하고 직접 입력은 유지한다", async () => {
  const { createMockApi } = h.load("api/mock/mockApi.ts");
  const api = createMockApi();
  const automatic = await api.signup({ handle: "", nick: "", interests: [] });
  const nickname = automatic.users[automatic.session.meId].nick;
  assert.ok(NICKNAME_PREFIXES.some((p) => nickname === `${p} 주인장`));
  const direct = await api.signup({
    handle: "another.maker",
    nick: "직접 입력",
    interests: [],
  });
  assert.equal(direct.users[direct.session.meId].nick, "직접 입력");
});
