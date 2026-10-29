import type {
  AiSearchResult,
  Review,
  ReviewInput,
  ReviewRole,
  ServiceInput,
  Service,
  SessionState,
  SignupInput,
  Snapshot,
  UrlServerCheck,
  User,
} from "./types";

/**
 * WEBTER 프론트의 데이터 접근 계약.
 * 화면과 스토어는 이 인터페이스만 호출한다. 현재 구현은 `mock/mockApi.ts`(메모리)이다.
 * 백엔드(Spring Boot) 연동 시 같은 인터페이스를 구현한 클라이언트로 바꿀 수 있지만,
 * 이 인터페이스가 실제 HTTP API 명세를 확정한 것은 아니다.
 */
export interface WebterApi {
  bootstrap(): Promise<Snapshot>;

  /* 세션 */
  login(): Promise<{ users: Record<string, User>; session: SessionState }>;
  signup(
    input: SignupInput,
  ): Promise<{ users: Record<string, User>; session: SessionState }>;
  logout(): Promise<SessionState>;
  /** 등록한 서비스 삭제, 작성한 리뷰는 “탈퇴한 사용자”로 남긴다 */
  withdraw(): Promise<Pick<Snapshot, "services" | "reviews" | "session">>;
  updateProfile(patch: Partial<User>): Promise<User>;

  /* 반응 */
  toggleLike(serviceId: string): Promise<{ service: Service; on: boolean }>;
  toggleSave(serviceId: string): Promise<{ service: Service; on: boolean }>;
  recordView(serviceId: string): Promise<Service>;
  recordClick(serviceId: string): Promise<Service>;
  report(key: string): Promise<void>;

  /* 리뷰 */
  addReview(
    serviceId: string,
    role: ReviewRole,
    input: ReviewInput,
  ): Promise<Review>;
  updateReview(reviewId: string, input: ReviewInput): Promise<Review>;
  deleteReview(reviewId: string): Promise<void>;
  setReply(reviewId: string, text: string | null): Promise<Review>;

  /* 서비스 */
  createService(input: ServiceInput): Promise<Service>;
  updateService(serviceId: string, patch: Partial<Service>): Promise<Service>;
  deleteService(serviceId: string): Promise<void>;
  checkServiceUrl(url: string, selfId?: string): Promise<UrlServerCheck>;

  /* 검색 */
  aiSearch(query: string): Promise<AiSearchResult>;
}
