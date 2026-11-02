"use client";

/** 개발 전용: 앱 셸 바깥에서 오류가 난 상황을 재현한다. 앱 전체 오류 화면이 뜬다(뒤로 가기로 돌아온다) */
export default function CrashApp(): never {
  throw new Error("개발용: 앱 전체 오류");
}
