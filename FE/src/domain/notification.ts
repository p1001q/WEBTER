import type { Notification } from "@/api/types";
import type { RouteName, RouteParams } from "@/lib/routes";

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
    case "hidden":
      return { to: "manage", params: {} };
  }
}
