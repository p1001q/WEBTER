"use client";

/** 개발 전용: 화면을 그리다 오류가 난 상황을 재현한다. 앱 셸이 남고 본문만 오류 안내로 바뀐다 */
export default function CrashScreen(): never {
  throw new Error("개발용: 화면 렌더링 오류");
}
