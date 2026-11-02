// 개발 전용: API 호출에 지연·실패를 끼워 넣어 오류 화면을 직접 볼 수 있게 한다. 프로덕션 빌드에는 들어가지 않는다.
import { ApiError } from "@/api/errors";
import type { WebterApi } from "@/api/webterApi";

export type Fault = "none" | "server" | "network" | "session" | "slow";

/** 로그인 만료 상황에서도 정상으로 처리하는 요청(로그인 자체, 읽기, 사용자에게 보이지 않는 집계) */
const SILENT_OR_READ = new Set<keyof WebterApi>([
  "login",
  "signup",
  "logout",
  "bootstrap",
  "recordView",
  "recordClick",
  "aiSearch",
  "checkServiceUrl",
]);

const SLOW_MS = 3000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 선택한 오류 상황에 맞춰 API 호출을 늦추거나 실패시킨다. `fault` 는 호출 시점의 값을 읽는다 */
export function withFaults(api: WebterApi, fault: () => Fault): WebterApi {
  return new Proxy(api, {
    get(target, key: string) {
      const fn = target[key as keyof WebterApi] as unknown;
      if (typeof fn !== "function") return fn;
      return async (...args: unknown[]) => {
        const f = fault();
        if (f === "slow") await wait(SLOW_MS);
        else if (f === "network") {
          await wait(400);
          throw new ApiError("network");
        } else if (f === "server") {
          await wait(400);
          throw new ApiError("server");
        } else if (
          f === "session" &&
          !SILENT_OR_READ.has(key as keyof WebterApi)
        ) {
          await wait(400);
          throw new ApiError("auth");
        }
        return (fn as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
}
