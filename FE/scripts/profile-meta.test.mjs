import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { harness } from "./helpers/uiHarness.mjs";

process.env.API_INTERNAL_BASE_URL = "http://be.test";
process.env.NEXT_PUBLIC_API_BASE_URL = "http://be.test";
const h = harness();
const { fetchProfileMeta, profileMetadata } = h.load("api/real/profileMeta.ts");
const { SITE_DESCRIPTION } = h.load("lib/shareMetadata.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const serve = (status, data) => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return {
      ok: status < 400,
      json: async () => ({ success: status < 400, data }),
    };
  };
  return calls;
};

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const profile = {
  id: ID,
  username: "maker",
  nickname: "메이커",
  avatarUrl: "https://cdn.test/a.png",
  bio: " 타이머를 만들어요 ",
  links: [],
  serviceCount: 1,
  receivedLikes: 0,
  moderated: false,
};

test("프로필의 닉네임·아이디·소개·사진을 읽는다", async () => {
  const calls = serve(200, profile);
  assert.deepEqual(await fetchProfileMeta(ID), {
    nickname: "메이커",
    username: "maker",
    bio: "타이머를 만들어요",
    avatarUrl: "https://cdn.test/a.png",
  });
  assert.equal(calls[0], `http://be.test/api/users/${ID}`);
});

test("없는 사용자이거나 UUID가 아니거나 서버에 닿지 않으면 값을 주지 않는다", async () => {
  serve(404, null);
  assert.equal(await fetchProfileMeta(ID), null);
  const calls = serve(200, profile);
  assert.equal(await fetchProfileMeta("../services/1"), null);
  assert.equal(calls.length, 0);
  globalThis.fetch = async () => {
    throw new Error("down");
  };
  assert.equal(await fetchProfileMeta(ID), null);
});

test("제목은 닉네임 / @아이디, 설명은 소개, 이미지는 프로필 사진이다", () => {
  const m = profileMetadata(ID, {
    nickname: "메이커",
    username: "maker",
    bio: "타이머를 만들어요",
    avatarUrl: "https://cdn.test/a.png",
  });
  assert.equal(m.title, "메이커 / @maker");
  assert.equal(m.openGraph.title, "메이커 / @maker");
  assert.equal(m.openGraph.description, "타이머를 만들어요");
  assert.deepEqual(m.openGraph.images, [{ url: "https://cdn.test/a.png" }]);
});

test("소개·사진이 없으면(제재 포함) 사이트 기본 설명·이미지를 쓴다", () => {
  const m = profileMetadata(ID, {
    nickname: "메이커",
    username: "maker",
    bio: "",
    avatarUrl: null,
  });
  assert.equal(m.description, SITE_DESCRIPTION);
  assert.equal(m.openGraph.images[0].url, "/og-default.png");
});
