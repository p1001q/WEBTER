import assert from "node:assert/strict";
import { test } from "node:test";
import { deferred, harness, settle } from "./helpers/uiHarness.mjs";

function mountInteractions(t, api) {
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
  };
  return () => h.render(useRealInteractions, props).actions;
}

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
