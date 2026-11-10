import { API_SERVER_BASE, realAuth } from "./auth/config";
import { createMockApi, type MockOptions } from "./mock/mockApi";
import { fetchPublicServices, makersOf, mapService } from "./real/serviceApi";
import { submitReport } from "./real/reportApi";
import { withRealServices } from "./real/serviceActions";
import type { Snapshot } from "./types";
import type { WebterApi } from "./webterApi";

export type { WebterApi } from "./webterApi";
export type { MockOptions } from "./mock/mockApi";
export { ME_ID } from "./mock/seed";

/** 앱이 쓰는 API 클라이언트를 만든다. 백엔드 연동 시 이 함수가 돌려주는 구현을 바꾼다. 호출마다 독립된 인스턴스를 만든다. */
export function createApi(opts?: MockOptions): WebterApi {
  const mock = createMockApi(opts);
  return realAuth ? { ...withRealServices(mock), report: submitReport } : mock;
}

/**
 * 앱이 시작할 때 쓰는 초기 데이터. 백엔드 주소가 있으면 서비스 목록을 서버에서 받아 오고(서버 렌더링),
 * 없으면 목업 데이터를 쓴다. 리뷰·댓글과 내 반응은 브라우저에서 별도로 조회한다. 알림은 비어 있다.
 */
export async function loadSnapshot(): Promise<Snapshot> {
  if (!realAuth) return createApi().bootstrap();
  const items = await fetchPublicServices(API_SERVER_BASE);
  const users: Snapshot["users"] = {};
  for (const item of items)
    for (const maker of makersOf(item)) users[maker.id] ??= maker;
  return {
    users,
    services: items.map(mapService),
    reviews: [],
    comments: [],
    notifications: [],
    takenHandles: [],
    session: {
      meId: null,
      likes: [],
      saves: [],
      reported: [],
      guestReviewed: [],
      aiUsed: 0,
      todayCount: 0,
    },
  };
}
