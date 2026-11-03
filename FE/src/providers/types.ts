import type { Dispatch, SetStateAction } from "react";
import type {
  AiSearchResult,
  Comment,
  CommentInput,
  OpenSourceItem,
  Review,
  ReviewInput,
  ReviewRole,
  Service,
  ServiceInput,
  UrlServerCheck,
  User,
} from "@/api/types";
import type { ToastContent } from "@/components/ui/Toast";
import type { ReviewAgg } from "@/domain/review";
import type { RouteName, RouteParams } from "@/lib/routes";

export type ViewMode = "card" | "list";

export interface ReportTarget {
  type: "service" | "review" | "reply" | "comment" | "profile";
  /** 'review:r2' 처럼 type:id */
  key: string;
  label?: string;
  preset?: string;
}

export type ModalState =
  | { type: "login"; reason?: string }
  | { type: "report"; target: ReportTarget }
  | { type: "delete"; sid: string }
  | { type: "delete-review"; rid: string }
  | { type: "comment"; sid: string; comment: Comment }
  | { type: "delete-comment"; cid: string }
  | { type: "stop"; sid: string }
  | { type: "review"; sid: string; review: Review }
  | { type: "versions"; sid: string }
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
  opensource: OpenSourceItem[];
  likes: Set<string>;
  saves: Set<string>;
  reported: Set<string>;
  guestReviewed: Set<string>;
  takenHandles: string[];
  aiUsed: number;
  todayCount: number;

  view: ViewMode;
  setView: (v: ViewMode) => void;
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

  // 쓰기 동작은 실패하면 안내(토스트·연결 배너·로그인 만료 모달)를 직접 띄우고 false 를 돌려준다.
  // 호출한 쪽은 true 일 때만 모달을 닫거나 입력값을 비운다.
  login: (back?: string) => Promise<boolean>;
  signup: (
    data: { handle: string; nick: string; interests: User["interests"] },
    back?: string,
  ) => Promise<boolean>;
  logout: () => Promise<boolean>;
  withdraw: () => Promise<boolean>;
  updateMe: (patch: Partial<User>) => Promise<boolean>;

  launch: (s: Service) => Promise<void>;
  openSource: (s: Service) => void;
  copyLink: (s: Service) => Promise<void>;
  toggleLike: (id: string) => Promise<boolean>;
  toggleSave: (id: string) => Promise<boolean>;
  report: (key: string) => Promise<boolean>;
  countView: (s: Service) => void;

  addReview: (s: Service, role: ReviewRole, v: ReviewInput) => Promise<boolean>;
  updateReview: (id: string, v: ReviewInput) => Promise<boolean>;
  deleteReview: (id: string) => Promise<boolean>;
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
