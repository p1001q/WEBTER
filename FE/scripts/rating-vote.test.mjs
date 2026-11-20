import assert from "node:assert/strict";
import test from "node:test";
import { harness, nodes } from "./helpers/uiHarness.mjs";

test("상단 추천과 하단 추천·비추천은 같은 상태로 선택·해제·전환", () => {
  let current = "none";
  const wt = {
    me: { id: "viewer" },
    users: { owner: { id: "owner", nick: "제작자" } },
    saves: new Set(),
    myVote: () => current,
    myReviewStatus: () => "ready",
    myReview: () => null,
    requireLogin: (action) => action(),
    vote: (_id, rate) => {
      current = current === rate ? "none" : rate;
    },
    agg: () => ({ up: current === "up" ? 1 : 0 }),
    loadMyReview() {},
  };
  const h = harness({ "@/providers/context": { useWt: () => wt } });
  const { RatingVote, useServiceRating, RetryMyReview } = h.load(
    "components/review/RatingVote.tsx",
  );
  const top = harness({
    "@/providers/context": { useWt: () => wt },
    "@/components/review/RatingVote": { useServiceRating, RetryMyReview },
  });
  const { ServiceOverview } = top.load(
    "app/(main)/services/[id]/_components/ServiceOverview.tsx",
  );
  const { BLANK_PREVIEW } = h.load(
    "app/(main)/services/_components/serviceFormState.ts",
  );
  const s = {
    ...BLANK_PREVIEW,
    id: "service1",
    owner: "owner",
    name: "서비스",
  };
  const upper = () => top.render(ServiceOverview, { s, isOwner: false });
  const lower = () => h.render(RatingVote, { s });
  const recommendation = () =>
    nodes(upper(), (n) => n.props?.["aria-label"]?.startsWith("추천 "))[0];
  const vote = (rate) =>
    nodes(lower(), (n) => n.props?.["aria-label"] === rate)[0];
  assert.equal(vote("비추천").props["aria-pressed"], false);
  recommendation().props.onClick();
  assert.equal(vote("추천").props["aria-pressed"], true);
  vote("비추천").props.onClick();
  assert.equal(recommendation().props["aria-pressed"], false);
  assert.equal(vote("비추천").props["aria-pressed"], true);
  vote("추천").props.onClick();
  assert.equal(recommendation().props["aria-pressed"], true);
  recommendation().props.onClick();
  assert.equal(vote("추천").props["aria-pressed"], false);
  assert.equal(current, "none");
  h.dispose();
  top.dispose();
});
