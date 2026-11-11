import assert from "node:assert/strict";
import { test } from "node:test";
import { harness } from "./helpers/uiHarness.mjs";

const h = harness();
const { mapNotification } = h.load("api/real/notificationApi.ts");
const { notificationText, notificationTarget } = h.load(
  "domain/notification.ts",
);
const { isMaker } = h.load("domain/maker.ts");

const backend = (over = {}) => ({
  id: "5",
  type: "REVIEW_CREATED",
  actor: { id: "u-2", username: "writer", nickname: "작성자" },
  serviceId: "12",
  serviceName: "타이머",
  reviewId: "31",
  commentId: null,
  quote: "쓰기 편해요",
  invitation: null,
  read: false,
  createdAt: "2026-11-09T16:30:00Z",
  ...over,
});

test("서버 알림을 화면 알림으로 바꾸고 작성자는 회원 정보로 따로 돌려준다", () => {
  const [m] = mapNotification(backend());
  assert.equal(m.item.kind, "review");
  assert.equal(m.item.actor, "u-2");
  assert.equal(m.item.sid, "12");
  assert.equal(m.item.serviceName, "타이머");
  assert.equal(m.item.date, "2026-11-10");
  assert.equal(m.item.quote, "쓰기 편해요");
  assert.equal(m.item.read, false);
  assert.equal(m.actor.handle, "writer");
});

test("익명·비회원이 일으킨 알림은 작성자가 없고, 서비스가 지워졌으면 sid가 비어 있다", () => {
  const [m] = mapNotification(
    backend({ type: "COMMENT_CREATED", actor: null, serviceId: null }),
  );
  assert.equal(m.item.kind, "comment");
  assert.equal(m.item.actor, undefined);
  assert.equal(m.actor, undefined);
  assert.equal(m.item.sid, "");
});

test("종류마다 화면 종류에 맞추고 알 수 없는 종류는 건너뛴다", () => {
  const kinds = {
    COMMENT_REPLY: "reply",
    REVIEW_REPLY: "maker-reply",
    TEAM_INVITATION: "invite",
    TEAM_INVITATION_ACCEPTED: "invite-accepted",
    TEAM_INVITATION_DECLINED: "invite-declined",
    SERVICE_HIDDEN: "hidden",
    SERVICE_UNHIDDEN: "unhidden",
    SERVICE_BLOCKED: "blocked",
    CONTENT_HIDDEN: "content-hidden",
    REGISTRATION_RESTRICTED: "restricted",
  };
  for (const [type, kind] of Object.entries(kinds))
    assert.equal(mapNotification(backend({ type }))[0].item.kind, kind);
  assert.deepEqual(mapNotification(backend({ type: "UNKNOWN_TYPE" })), []);
});

test("팀 초대 알림은 초대 상태를 들고 있고 문구·이동 화면이 정해져 있다", () => {
  const [m] = mapNotification(
    backend({
      type: "TEAM_INVITATION",
      invitation: { id: "9", status: "PENDING" },
    }),
  );
  assert.deepEqual({ ...m.item.invite }, { id: "9", status: "PENDING" });
  assert.equal(
    notificationText(m.item, "작성자", "타이머"),
    "작성자 님이 타이머의 팀원으로 초대했어요.",
  );
  assert.equal(notificationTarget(m.item).to, "manage");
  assert.equal(
    notificationText({ kind: "invite-accepted" }, "작성자", "타이머"),
    "작성자 님이 타이머의 팀원 초대를 수락했어요.",
  );
  assert.equal(
    notificationText({ kind: "invite-declined" }, "작성자", "타이머"),
    "작성자 님이 타이머의 팀원 초대를 거절했어요.",
  );
});

test("등록자와 수락한 팀원은 제작자이고 그 밖의 회원과 비로그인은 아니다", () => {
  const s = { owner: "u-1", members: ["u-2"] };
  assert.equal(isMaker(s, "u-1"), true);
  assert.equal(isMaker(s, "u-2"), true);
  assert.equal(isMaker(s, "u-3"), false);
  assert.equal(isMaker(s, null), false);
  assert.equal(isMaker({ owner: "u-1" }, "u-2"), false);
});

test("운영 처리 알림은 대상 종류와 사유를 문구·이동에 반영한다", () => {
  const [hidden] = mapNotification(
    backend({ type: "CONTENT_HIDDEN", targetKind: "COMMENT", quote: null }),
  );
  assert.equal(hidden.item.targetKind, "COMMENT");
  assert.equal(
    notificationText(hidden.item, "", "타이머"),
    "내 댓글이(가) 신고가 쌓여 임시 비공개되었어요. 운영자가 검토하고 있어요.",
  );
  assert.deepEqual(
    { ...notificationTarget(hidden.item).params },
    { id: "12", tab: "comments" },
  );
  const [profile] = mapNotification(
    backend({ type: "CONTENT_HIDDEN", targetKind: "PROFILE", serviceId: null }),
  );
  assert.equal(notificationTarget(profile.item).to, "mypage");
  const [blocked] = mapNotification(
    backend({ type: "SERVICE_BLOCKED", quote: null, reason: "최종 검토 결과" }),
  );
  assert.equal(blocked.item.quote, "최종 검토 결과");
  assert.equal(notificationTarget(blocked.item).to, "manage");
  const [restricted] = mapNotification(
    backend({
      type: "REGISTRATION_RESTRICTED",
      serviceId: null,
      quote: null,
      reason: "등록 규칙 위반",
    }),
  );
  assert.equal(restricted.item.quote, "등록 규칙 위반");
  assert.equal(notificationTarget(restricted.item).to, "mypage");
});
