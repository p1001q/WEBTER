import type { Grade, Review, ReviewCounts, Service, User } from "@/api/types";
import { POLICY } from "./policy";

export const GRADE_LABEL: Record<Grade, string> = {
  vpos: "매우 긍정적",
  pos: "긍정적",
  mpos: "대체로 긍정적",
  mixed: "복합적",
  mneg: "대체로 부정적",
  neg: "부정적",
  vneg: "매우 부정적",
  few: "평가 수 부족",
};

export interface GradeInfo {
  grade: Grade;
  ratio: number | null;
  n: number;
}
/** 등급 판정 — 비율은 반올림하지 않은 실수로 비교(제안): 5~19개 구간의 “19% 이하”는 ratio < 20 으로 처리해 19~20% 공백을 없앤다 */
export function gradeOf(up: number, down: number): GradeInfo {
  const n = up + down;
  if (n < POLICY.reviewMinForGrade || n === 0)
    return { grade: "few", ratio: n ? (up / n) * 100 : null, n };
  const r = (up / n) * 100;
  let g: Grade;
  if (n < POLICY.gradeBigN) g = r >= 80 ? "pos" : r < 20 ? "neg" : "mixed";
  else
    g =
      r >= 80
        ? "vpos"
        : r >= 70
          ? "mpos"
          : r >= 40
            ? "mixed"
            : r >= 20
              ? "mneg"
              : "vneg";
  return { grade: g, ratio: r, n };
}

export interface ReviewAgg extends ReviewCounts, GradeInfo {
  total: number;
  visible: number;
}
/** 평가 집계 — R-REVIEW. 미설정·제작자 리뷰 제외 */
export function reviewAgg(s: Service, reviews: Review[]): ReviewAgg {
  const vis = reviews.filter((r) => r.sid === s.id);
  let { up, down, none } = s.rv;
  vis.forEach((r) => {
    if (r.a.kind === "maker") return;
    if (r.rate === "up") up++;
    else if (r.rate === "down") down++;
    else none++;
  });
  const makerCount = vis.filter((r) => r.a.kind === "maker").length;
  const total = up + down + none + makerCount;
  return { up, down, none, total, visible: vis.length, ...gradeOf(up, down) };
}

export const ratioText = (r: number | null) =>
  r == null ? "–" : Math.round(r) + "%";

export const authorName = (a: Review["a"], users: Record<string, User>) =>
  a.kind === "guest"
    ? `비회원 ${a.ip}`
    : a.kind === "anon"
      ? "익명"
      : a.kind === "left"
        ? "탈퇴한 사용자"
        : a.uid && users[a.uid]
          ? users[a.uid].nick
          : "알 수 없음";

/** 리뷰·답글 링크 입력 제한 */
export const hasLink = (t: string) =>
  /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|kr|io|app|dev|co|org|me|xyz|ly|site)\b)/i.test(
    t,
  );
