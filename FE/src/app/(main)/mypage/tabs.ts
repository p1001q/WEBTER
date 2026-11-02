export const MYPAGE_TABS = [
  "services",
  "saved",
  "reviews",
  "comments",
  "settings",
] as const;
export type MyPageTab = (typeof MYPAGE_TABS)[number];
