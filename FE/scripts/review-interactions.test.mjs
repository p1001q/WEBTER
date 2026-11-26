import assert from "node:assert/strict";
import { test } from "node:test";
import { deferred, harness, settle } from "./helpers/uiHarness.mjs";

function mountInteractions(t, api, overrides = {}) {
  const h = harness({
    "@/api/auth/config": { realAuth: true },
    "@/api/real/interactionApi": { interactionApi: api },
    "@/api/real/profileApi": {
      profileApi: { liked: async () => [], saved: async () => [] },
    },
  });
  t.after(() => h.dispose());
  const { useRealInteractions } = h.load("providers/useRealInteractions.ts");
  const noop = () => {};
  const props = {
    viewerEpoch: { current: 1 },
    me: { id: "member" },
    meId: "member",
    reviews: [],
    comments: [],
    setReviews: noop,
    setComments: noop,
    setUsers: noop,
    setLikes: noop,
    setSaves: noop,
    setOffline: noop,
    toast: noop,
    call: (run) => run(),
    act: async (_what, run) => {
      await run();
      return true;
    },
    ...overrides,
  };
  return () => h.render(useRealInteractions, props).actions;
}

test("등록자와 수락한 팀원은 역할 값을 바꿔도 본인 서비스 리뷰를 요청할 수 없다", async (t) => {
  const write = t.mock.fn();
  const render = mountInteractions(t, { addReview: write });
  const input = { text: "리뷰 시도", rate: "none" };
  for (const service of [
    { id: "owned", owner: "member" },
    { id: "team", owner: "other", members: ["member"] },
  ]) {
    for (const role of ["member", "maker", "guest"]) {
      await assert.rejects(
        render().addReview(service, role, input),
        /본인 서비스/,
      );
    }
  }
  assert.equal(write.mock.callCount(), 0);
});

test("수정 권한이 사라진 기존 리뷰는 수정 요청을 보내지 않는다", async (t) => {
  const update = t.mock.fn();
  const render = mountInteractions(
    t,
    { updateReview: update },
    {
      reviews: [{ id: "old", sid: "team", permissions: { canEdit: false } }],
    },
  );
  await assert.rejects(render().updateReview("old", { text: "수정 시도" }));
  assert.equal(update.mock.callCount(), 0);
});

test("내 평가 조회를 실패한 뒤 다시 시도하면 기존 평가가 복구된다", async (t) => {
  const first = deferred();
  const responses = [
    () => first.promise,
    (sid) => Promise.resolve({ item: { id: "review", sid, rate: "up" } }),
  ];
  const read = t.mock.fn((sid) => responses.shift()(sid));
  const render = mountInteractions(t, { myReview: read });
  assert.equal(render().myReviewStatus("service"), "idle");
  const loading = render().loadMyReview("service");
  await render().loadMyReview("service");
  assert.equal(read.mock.callCount(), 1);
  assert.equal(render().myReviewStatus("service"), "loading");
  first.reject(new Error("temporary failure"));
  await loading;
  assert.equal(render().myReviewStatus("service"), "error");

  await render().loadMyReview("service");
  assert.equal(render().myReviewStatus("service"), "ready");
  assert.equal(render().myVote("service"), "up");
});

test("리뷰가 갱신된 뒤 도착한 이전 내 평가를 버리고 같은 서비스를 다시 조회한다", async (t) => {
  const first = deferred();
  const current = deferred();
  const responses = [first, current];
  const read = t.mock.fn(() => responses.shift().promise);
  const render = mountInteractions(t, {
    myReview: read,
    setVote: async () => ({ up: 1, down: 0, mine: "up" }),
  });
  const sid = "service";
  const loading = render().loadMyReview(sid);
  await render().voteOnReview({ id: "another-review", sid }, "up");
  first.resolve({ item: { id: "review", sid, rate: "up" } });
  await settle();
  assert.deepEqual(
    read.mock.calls.map(({ arguments: args }) => args),
    [[sid], [sid]],
  );
  assert.equal(render().myReviewStatus(sid), "loading");
  assert.equal(render().myVote(sid), null);

  current.resolve({ item: { id: "review", sid, rate: "down" } });
  await loading;
  assert.equal(render().myReviewStatus(sid), "ready");
  assert.equal(render().myVote(sid), "down");
});
