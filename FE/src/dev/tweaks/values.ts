import { ME_ID, type MockOptions } from "@/api";
import type { Service } from "@/api/types";

// 개발 전용: 데모 컨트롤(Tweaks)이 바꾸는 값과 목업 DB 옵션. 프로덕션 빌드에는 들어가지 않는다.

export interface TweakValues {
  session: "guest" | "member" | "signup";
  /** 확장 기능 표시(ScopeBadge) 노출 여부 */
  scope: boolean;
  cols: 3 | 4;
  sample: "default" | "none" | "stopped";
  viewport: "desktop" | "mobile";
}

export const DEFAULT_TWEAKS: TweakValues = {
  session: "guest",
  scope: true,
  cols: 4,
  sample: "default",
  viewport: "desktop",
};

const KEY = "webter-dev-tweaks";

/** 새로고침과 모바일 미리보기(iframe)가 같은 설정으로 시작하도록 localStorage 에 둔다 */
export function loadTweaks(): TweakValues {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_TWEAKS, ...JSON.parse(raw) } : DEFAULT_TWEAKS;
  } catch {
    return DEFAULT_TWEAKS;
  }
}

export function saveTweaks(t: TweakValues) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    /* 저장이 막힌 환경에서는 설정을 유지하지 못할 뿐이다 */
  }
}

/** 신규 가입은 비회원 상태로 로그인 화면에서 시작한다 */
export function mockOptions(t: TweakValues): MockOptions {
  return {
    me: t.session === "member" ? ME_ID : null,
    sample: t.sample === "none" ? "none" : undefined,
    mutate:
      t.sample === "stopped"
        ? (list) =>
            list.map((s): Service =>
              s.owner === ME_ID && s.pub === "public"
                ? { ...s, use: "stop", stopReason: "데모: 점검 중이에요." }
                : s,
            )
        : undefined,
  };
}
