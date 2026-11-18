import type { Comment, User } from "@/api/types";
import { DEPARTED_MEMBER_NAME } from "./policy";

/** 댓글 작성자 이름: 익명·탈퇴 처리된 작성자는 실명을 드러내지 않는다 */
export const commentAuthorName = (
  a: Comment["a"],
  users: Record<string, User>,
) =>
  a.kind === "anon"
    ? "익명"
    : a.kind === "left"
      ? DEPARTED_MEMBER_NAME
      : a.uid && users[a.uid]
        ? users[a.uid].nick
        : "알 수 없음";

export const COMMENT_MAX = 500;
