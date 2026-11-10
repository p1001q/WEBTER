import assert from "node:assert/strict";
import { test } from "node:test";
import { harness } from "./helpers/uiHarness.mjs";

const calls = [];
const respond = { value: null };
const h = harness({
  "../auth/http": {
    getJson: async (path) => {
      calls.push(path);
      return respond.value;
    },
  },
  "./interactionApi": {
    mapReview: (r) => ({ item: { kind: "review", ...r } }),
    mapComment: (c) => ({ item: { kind: "comment", ...c } }),
  },
});
const { profileApi, profileToUser } = h.load("api/real/profileApi.ts");

test("서버 프로필을 화면용 사용자로 바꾼다(소개·외부 링크)", () => {
  const u = profileToUser({
    id: "u-1",
    username: "maker_one",
    nickname: "제작자",
    bio: "작은 도구를 만들어요",
    links: [
      { kind: "blog", url: "https://blog.example.test" },
      { kind: "github", url: "https://github.com/maker" },
    ],
    serviceCount: 2,
    receivedLikes: 5,
  });
  assert.equal(u.id, "u-1");
  assert.equal(u.nick, "제작자");
  assert.equal(u.handle, "maker_one");
  assert.equal(u.bio, "작은 도구를 만들어요");
  assert.deepEqual(u.links, [
    ["blog", "https://blog.example.test"],
    ["github", "https://github.com/maker"],
  ]);
});

test("프로필 조회는 사용자 id를 인코딩해 보낸다", async () => {
  calls.length = 0;
  respond.value = {
    id: "a/b",
    username: "x",
    nickname: "y",
    bio: null,
    links: [],
  };
  const u = await profileApi.profile("a/b");
  assert.equal(calls[0], "/api/users/a%2Fb");
  assert.equal(u.bio, "");
});

test("내 좋아요·저장은 서버 순서를 그대로 쓴다", async () => {
  calls.length = 0;
  respond.value = ["3", "1"];
  assert.deepEqual(await profileApi.liked(), ["3", "1"]);
  respond.value = [{ serviceId: "2", savedAt: "2026-11-10T00:00:00Z" }];
  assert.deepEqual(
    (await profileApi.saved()).map((s) => s.serviceId),
    ["2"],
  );
  assert.deepEqual(calls, ["/api/users/me/liked", "/api/users/me/saved"]);
});

test("내 리뷰·댓글은 서비스별 조회와 같은 변환을 쓴다", async () => {
  calls.length = 0;
  respond.value = [{ id: "1" }];
  assert.equal((await profileApi.myReviews())[0].item.kind, "review");
  assert.equal((await profileApi.myComments())[0].item.kind, "comment");
  assert.deepEqual(calls, ["/api/users/me/reviews", "/api/users/me/comments"]);
});
