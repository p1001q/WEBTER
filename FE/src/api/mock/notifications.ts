import type { Notification } from "../types";

/** 알림 목업. 로그인한 기본 회원(u_me)의 알림이다. 날짜는 DISPLAY.demoToday(2026-10-22) 기준 */
export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "nt1",
    kind: "comment",
    actor: "u_pixel",
    sid: "s11",
    date: "2026-10-22",
    read: false,
    quote: "투표 결과를 링크로 공유할 수 있으면 좋겠어요.",
  },
  {
    id: "nt2",
    kind: "review",
    actor: "u_mint",
    sid: "s10",
    date: "2026-10-21",
    read: false,
    quote: "타이머가 깔끔하고 주간 리포트가 도움이 돼요.",
  },
  {
    id: "nt3",
    kind: "hidden",
    sid: "s17",
    date: "2026-10-20",
    read: false,
  },
  {
    id: "nt4",
    kind: "maker-reply",
    actor: "u_pixel",
    sid: "s12",
    date: "2026-10-19",
    read: false,
    quote: "의견 고마워요. 다음 버전에서 반영할게요.",
  },
  {
    id: "nt5",
    kind: "reply",
    actor: "u_bori",
    sid: "s01",
    date: "2026-10-17",
    read: true,
    quote: "저도 그 기능 기다려요.",
  },
  {
    id: "nt6",
    kind: "review",
    actor: "u_kiwi",
    sid: "s11",
    date: "2026-10-12",
    read: true,
    quote: "설문 만들기가 정말 빠르네요.",
  },
];
