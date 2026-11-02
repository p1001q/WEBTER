export const MYPAGE_TABS = [
  "services",
  "saved",
  "reviews",
  "settings",
] as const;
export type MyPageTab = (typeof MYPAGE_TABS)[number];
