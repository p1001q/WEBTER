"use client";

import { ErrorNotice } from "@/components/layout/Restricted";

/** 화면 하나를 그리다 오류가 났을 때. 앱 셸(헤더·사이드바)은 그대로 두고 본문만 안내로 바꾼다 */
export default function ScreenError({ reset }: { reset: () => void }) {
  return <ErrorNotice onRetry={reset} />;
}
