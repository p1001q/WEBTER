import { createMockApi, type MockOptions } from "./mock/mockApi";
import type { WebterApi } from "./webterApi";

export type { WebterApi } from "./webterApi";
export type { MockOptions } from "./mock/mockApi";
export { ME_ID } from "./mock/seed";

/** 앱이 쓰는 API 클라이언트를 만든다. 백엔드 연동 시 이 함수가 돌려주는 구현을 바꾼다. 호출마다 독립된 인스턴스를 만든다. */
export function createApi(opts?: MockOptions): WebterApi {
  return createMockApi(opts);
}
