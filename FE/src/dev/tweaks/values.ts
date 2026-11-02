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

/** 허용된 값만 받고 나머지는 기본값으로 둔다(저장된 값이 예전 형식이거나 손으로 고쳐졌을 수 있다) */
function sanitize(raw: Partial<Record<keyof TweakValues, unknown>>) {
  const pick = <K extends keyof TweakValues>(
    k: K,
    allowed: readonly TweakValues[K][],
  ): TweakValues[K] =>
    allowed.includes(raw[k] as TweakValues[K])
      ? (raw[k] as TweakValues[K])
      : DEFAULT_TWEAKS[k];
  return {
    session: pick("session", ["guest", "member", "signup"]),
    scope: pick("scope", [true, false]),
    cols: pick("cols", [3, 4]),
    sample: pick("sample", ["default", "none", "stopped"]),
    viewport: pick("viewport", ["desktop", "mobile"]),
  } satisfies TweakValues;
}

/** 새로고침과 모바일 미리보기(iframe)가 같은 설정으로 시작하도록 localStorage 에 둔다 */
export function loadTweaks(): TweakValues {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw) ?? {}) : DEFAULT_TWEAKS;
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
              s.owner === ME_ID
                ? { ...s, use: "stop", stopReason: "데모: 점검 중이에요." }
                : s,
            )
        : undefined,
  };
}
