import type { Notification } from "@/api/types";
import type { RouteName, RouteParams } from "@/lib/routes";

const TARGET_LABEL = {
  SERVICE: "서비스",
  REVIEW: "리뷰",
  REVIEW_REPLY: "제작자 답글",
  COMMENT: "댓글",
  PROFILE: "프로필",
} as const;

/** 알림 문구. 이름은 (닉네임, 서비스 이름) 순서로 받는다 */
export function notificationText(
  n: Notification,
  actor: string,
  service: string,
): string {
  switch (n.kind) {
    case "review":
      return `${actor} 님이 내 서비스 ${service}에 리뷰를 남겼어요.`;
    case "comment":
      return `${actor} 님이 내 서비스 ${service}에 댓글을 남겼어요.`;
    case "reply":
      return `${actor} 님이 ${service}의 내 댓글에 답글을 남겼어요.`;
    case "maker-reply":
      return `${actor} 님이 ${service}의 내 리뷰에 제작자 답글을 남겼어요.`;
    case "hidden":
      return `${service}이(가) 신고가 쌓여 임시 비공개되었어요. 운영자가 검토하고 있어요.`;
    case "unhidden":
      return `${service}의 임시 비공개가 해제되었어요.`;
    case "blocked":
      return `${service}이(가) 운영 검토 결과 비공개 처리되었어요.`;
    case "content-hidden":
      return `내 ${TARGET_LABEL[n.targetKind ?? "SERVICE"]}이(가) 신고가 쌓여 임시 비공개되었어요. 운영자가 검토하고 있어요.`;
    case "restricted":
      return "서비스 등록이 제한되었어요. 사유를 확인해 주세요.";
    case "invite":
      return `${actor} 님이 ${service}의 팀원으로 초대했어요.`;
    case "invite-accepted":
      return `${actor} 님이 ${service}의 팀원 초대를 수락했어요.`;
    case "invite-declined":
      return `${actor} 님이 ${service}의 팀원 초대를 거절했어요.`;
  }
}

/** 알림을 누르면 이동할 화면 */
export function notificationTarget(n: Notification): {
  to: RouteName;
  params: RouteParams;
} {
  switch (n.kind) {
    case "review":
    case "maker-reply":
      return { to: "detail", params: { id: n.sid, tab: "reviews" } };
    case "comment":
    case "reply":
      return { to: "detail", params: { id: n.sid, tab: "comments" } };
    case "content-hidden":
      if (n.targetKind === "PROFILE") return { to: "mypage", params: {} };
      return {
        to: "detail",
        params: {
          id: n.sid,
          tab: n.targetKind === "COMMENT" ? "comments" : "reviews",
        },
      };
    case "restricted":
      return { to: "mypage", params: {} };
    case "hidden":
    case "unhidden":
    case "blocked":
    case "invite":
    case "invite-accepted":
    case "invite-declined":
      return { to: "manage", params: {} };
  }
}
