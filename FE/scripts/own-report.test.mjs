import assert from "node:assert/strict";
import test from "node:test";
import { harness, nodes } from "./helpers/uiHarness.mjs";

test("본인 댓글·익명 댓글·리뷰에는 신고를 숨기고 타인 글에는 표시", () => {
  const wt = {
    me: { id: "me" },
    users: {},
    comments: [],
    commentRevision: () => 0,
  };
  const h = harness({
    "@/providers/context": { useWt: () => wt },
    "@/api/auth/config": { realAuth: false },
  });
  const { CommentItem } = h.load("components/comment/CommentItem.tsx");
  const s = { id: "s1", owner: "maker" };
  const base = {
    id: "c1",
    a: { kind: "member", uid: "me" },
    date: "2026-11-20",
    text: "내용",
    rate: "none",
  };
  const reports = (tree) => nodes(tree, (n) => n.type === "ReportButton");
  assert.equal(reports(h.render(CommentItem, { c: base, s })).length, 0);
  assert.equal(
    reports(
      h.render(CommentItem, {
        c: { ...base, a: { kind: "anon" }, permissions: { mine: true } },
        s,
      }),
    ).length,
    0,
  );
  assert.equal(
    reports(
      h.render(CommentItem, {
        c: { ...base, a: { kind: "member", uid: "other" } },
        s,
      }),
    ).length,
    1,
  );
  const reviewHarness = harness({ "@/providers/context": { useWt: () => wt } });
  const { ReviewItem: Review } = reviewHarness.load(
    "components/review/ReviewItem.tsx",
  );
  assert.equal(reports(reviewHarness.render(Review, { r: base, s })).length, 0);
  assert.equal(
    reports(
      reviewHarness.render(Review, {
        r: { ...base, a: { kind: "member", uid: "other" } },
        s,
      }),
    ).length,
    1,
  );
  h.dispose();
  reviewHarness.dispose();
});
