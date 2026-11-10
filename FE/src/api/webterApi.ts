import type { ReportInput, ReportReceipt } from "@/domain/report";
import type {
  AiSearchResult,
  Comment,
  CommentInput,
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
  /** 실제 로그인한 회원(또는 로그아웃 상태 null)을 이 데이터 계층에 알린다. 이후 목업 쓰기 동작이 이 회원 기준으로 처리된다 */
  adoptMember(
    user: User | null,
  ): Promise<{ users: Record<string, User>; session: SessionState }>;
  /** 등록한 서비스 삭제, 작성한 리뷰는 “탈퇴한 사용자”로 남긴다 */
  withdraw(): Promise<
    Pick<Snapshot, "services" | "reviews" | "comments" | "session">
  >;
  updateProfile(patch: Partial<User>): Promise<User>;

  /* 반응 */
  toggleLike(serviceId: string): Promise<{ service: Service; on: boolean }>;
  toggleSave(serviceId: string): Promise<{ service: Service; on: boolean }>;
  recordView(serviceId: string): Promise<Service>;
  recordClick(serviceId: string): Promise<Service>;
  report(input: ReportInput): Promise<ReportReceipt>;

  /* 리뷰 */
  addReview(
    serviceId: string,
    role: ReviewRole,
    input: ReviewInput,
  ): Promise<Review>;
  updateReview(reviewId: string, input: ReviewInput): Promise<Review>;
  deleteReview(reviewId: string): Promise<void>;
  setReply(reviewId: string, text: string | null): Promise<Review>;

  /* 댓글 */
  addComment(
    serviceId: string,
    input: CommentInput,
    parentId?: string,
  ): Promise<Comment>;
  updateComment(commentId: string, input: CommentInput): Promise<Comment>;
  /** 답글이 달린 댓글은 자리만 남기고(deleted) 돌려준다. 지운 뒤 목록은 다시 받는다 */
  deleteComment(commentId: string): Promise<Comment[]>;

  /* 서비스 */
  /** 내가 등록한 서비스 전체(비공개·운영 중지 포함) */
  myServices(): Promise<Service[]>;
  createService(input: ServiceInput): Promise<Service>;
  updateService(serviceId: string, patch: Partial<Service>): Promise<Service>;
  deleteService(serviceId: string): Promise<void>;
  checkServiceUrl(url: string, selfId?: string): Promise<UrlServerCheck>;

  /* 검색 */
  aiSearch(query: string): Promise<AiSearchResult>;
}
