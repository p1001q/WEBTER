import type { ReportInput, ReportReceipt, ReportTarget } from "@/domain/report";
import type { Dispatch, SetStateAction } from "react";
import type {
  AiSearchResult,
  Comment,
  CommentInput,
  Notification,
  PolicyVersion,
  Rate,
  Review,
  ReviewInput,
  ReviewRole,
  Service,
  ServiceInput,
  UrlServerCheck,
  User,
} from "@/api/types";
import type { CursorPage, ReviewSort } from "@/api/real/interactionApi";
import type { ToastContent } from "@/components/ui/Toast";
import type { FilterState } from "@/domain/filter";
import type { ReviewAgg } from "@/domain/review";
import type { RouteName, RouteParams } from "@/lib/routes";

export type ViewMode = "card" | "list";

export type ModalState =
  | { type: "login"; reason?: string }
  | { type: "report"; target: ReportTarget }
  | { type: "delete"; sid: string }
  | { type: "delete-review"; rid: string }
  | { type: "comment"; sid: string; comment: Comment }
  | { type: "delete-comment"; cid: string }
  | { type: "stop"; sid: string }
  | { type: "review"; sid: string; review: Review }
  /** 리뷰가 있는 서비스에서 추천·비추천을 누르면, 리뷰를 수정할지 묻는다 */
  | { type: "confirm-review-edit"; sid: string; review: Review; rate: Rate }
  | { type: "versions"; sid: string }
  | { type: "team"; sid: string }
  | { type: "lightbox"; sid: string; index: number }
  | { type: "withdraw" }
  | { type: "session" };

export type ToastOptions = Omit<ToastContent, "msg">;

/** 화면이 공유하는 앱 상태와 동작. 데이터는 `WebterApi` 를 거쳐서만 바꾼다 */
export interface WtStore {
  me: User | null;
  users: Record<string, User>;
  services: Service[];
  publicServices: Service[];
  reviews: Review[];
  comments: Comment[];
  /** 내 알림(최신순은 화면에서 정렬한다). 목업 데이터이며 이 탭에서만 바뀐다 */
  notifications: Notification[];
  readNotification: (id: string) => void;
  readAllNotifications: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  /** 서비스 한 건을 서버에서 다시 받아 목록에 반영한다(팀 구성이 바뀐 뒤). 더는 볼 수 없으면 목록에서 뺀다 */
  reloadService: (sid: string) => Promise<void>;
  /** 받은 팀원 초대를 수락(true)하거나 거절(false)한다. 알림 id 로 부른다 */
  respondInvite: (id: string, accept: boolean) => void;
  likes: Set<string>;
  saves: Set<string>;
  reported: Set<string>;
  guestReviewed: Set<string>;
  takenHandles: string[];
  /** 실제 로그인을 쓸 때 서버 세션 확인이 끝났는지. 끝나기 전에는 로그인 상태를 알 수 없다 */
  sessionReady: boolean;
  aiUsed: number;
  todayCount: number;

  view: ViewMode;
  setView: (v: ViewMode) => void;
  /** 트렌딩·인기·최신이 함께 쓰는 목록 필터 */
  listFilter: FilterState;
  setListFilter: Dispatch<SetStateAction<FilterState>>;
  /** 화면 너비 560px 이하. 서버 렌더링과 첫 hydration 에서는 false */
  isMobile: boolean;
  side: boolean;
  setSide: (v: boolean) => void;
  modal: ModalState | null;
  /** 함수로 넘기면 지금 열린 모달을 보고 정한다(요청이 끝난 뒤 다른 모달을 닫지 않게) */
  setModal: Dispatch<SetStateAction<ModalState | null>>;
  toastState: ToastContent | null;
  toast: (msg: ToastContent["msg"], opts?: ToastOptions) => void;
  /** 서버와 연결되지 않은 상태(요청이 응답 없이 실패했거나 브라우저가 오프라인) */
  offline: boolean;
  dismissOffline: () => void;

  /** 현재 경로 + 쿼리. 클릭 같은 이벤트 시점에 읽는다(로그인 뒤 돌아올 주소) */
  currentPath: () => string;
  go: (
    name: RouteName,
    params?: RouteParams,
    opts?: { replace?: boolean },
  ) => void;
  /** 앱 안에 이전 화면이 있으면 뒤로, 없으면 홈으로 */
  back: () => void;
  requireLogin: (fn: () => void, reason?: string) => void;

  svc: (id: string | undefined) => Service | undefined;
  agg: (s: Service) => ReviewAgg;
  /** 내가 이 서비스에 남긴 평가(리뷰의 평가 또는 추천·비추천 단독 평가) */
  myVote: (sid: string) => "up" | "down" | null;
  /** 의견 없이 추천·비추천만 누른다. 같은 걸 다시 누르면 취소하고, 이미 리뷰가 있으면 리뷰의 평가를 바꾼다 */
  vote: (sid: string, rate: "up" | "down") => void;
  /** 평가를 직접 정한다(null 이면 취소). 리뷰 작성 폼의 평가 버튼이 쓴다 */
  setVote: (sid: string, rate: "up" | "down" | null) => void;
  /** 내가 이 서비스에 남긴 리뷰(의견까지 남긴 평가). 없으면 undefined */
  myReview: (sid: string) => Review | undefined;
  myReviewReady: (sid: string) => boolean;
  reviewRevision: (sid: string) => number;
  commentRevision: (sid: string) => number;
  loadReviews: (
    sid: string,
    sort: ReviewSort,
    cursor?: string,
  ) => Promise<CursorPage<string>>;
  loadComments: (
    sid: string,
    parentId?: string,
    cursor?: string,
  ) => Promise<CursorPage<string>>;
  /** 마이페이지가 열릴 때 서비스를 가리지 않고 내 리뷰·댓글과 저장 순서를 모은다(실제 서버 연결일 때만) */
  loadMypage: () => Promise<void>;
  /** 제작자 프로필이 열릴 때 서버가 가진 소개·외부 링크를 가져온다(실제 서버 연결일 때만) */
  loadProfile: (id: string) => Promise<void>;

  // 쓰기 동작은 실패하면 안내(토스트·연결 배너·로그인 만료 모달)를 직접 띄우고 false 를 돌려준다.
  // 호출한 쪽은 각 반환형의 성공 결과를 확인한 뒤 모달을 닫거나 입력값을 비운다.
  login: (back?: string) => Promise<boolean>;
  /** 약관 버전이 바뀌면 policyChanged를 돌려주며, 최신 약관에 다시 동의해야 한다. */
  signup: (
    data: {
      handle: string;
      nick: string;
      interests: User["interests"];
      consents?: PolicyVersion[];
    },
    back?: string,
  ) => Promise<boolean | "policyChanged">;
  logout: () => Promise<boolean>;
  withdraw: () => Promise<boolean>;
  /** 계정 설정은 입력칸을 서버 응답과 맞출 수 있도록 저장된 회원을 돌려준다. */
  updateMe: (patch: Partial<User>) => Promise<User | false>;

  launch: (s: Service) => Promise<void>;
  openSource: (s: Service) => void;
  copyLink: (s: Service) => Promise<void>;
  toggleLike: (id: string) => Promise<boolean>;
  toggleSave: (id: string) => Promise<boolean>;
  report: (input: ReportInput) => Promise<ReportReceipt | false>;
  countView: (s: Service) => void;

  addReview: (s: Service, role: ReviewRole, v: ReviewInput) => Promise<boolean>;
  updateReview: (id: string, v: ReviewInput) => Promise<boolean>;
  deleteReview: (id: string) => Promise<boolean>;
  voteOnReview: (review: Review, vote: "up" | "down") => Promise<boolean>;
  setReply: (rid: string, text: string | null) => Promise<boolean>;

  addComment: (
    s: Service,
    v: CommentInput,
    parentId?: string,
  ) => Promise<boolean>;
  updateComment: (id: string, v: CommentInput) => Promise<boolean>;
  deleteComment: (id: string) => Promise<boolean>;

  /** 실패하면 null */
  createService: (data: ServiceInput) => Promise<Service | null>;
  updateService: (id: string, patch: Partial<Service>) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;
  // 읽기 동작은 실패하면 ApiError 를 던진다. 화면이 그 자리에서 다시 시도할 수 있는 안내를 그린다.
  checkServiceUrl: (url: string, selfId?: string) => Promise<UrlServerCheck>;

  aiSearch: (q: string) => Promise<AiSearchResult>;
  /** AI 검색 1회 사용을 기록한다(실서비스에서는 서버가 횟수를 센다) */
  recordAiUse: () => void;
}
