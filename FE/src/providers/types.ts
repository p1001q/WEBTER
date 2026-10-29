import type {
  AiSearchResult,
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
  type: "service" | "review" | "reply" | "profile";
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
  | { type: "stop"; sid: string }
  | { type: "review"; sid: string; review: Review }
  | { type: "versions"; sid: string }
  | { type: "lightbox"; sid: string; index: number }
  | { type: "withdraw" };

export type ToastOptions = Omit<ToastContent, "msg">;

/** 화면이 공유하는 앱 상태와 동작. 데이터는 `WebterApi` 를 거쳐서만 바꾼다 */
export interface WtStore {
  me: User | null;
  users: Record<string, User>;
  services: Service[];
  publicServices: Service[];
  reviews: Review[];
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
  setModal: (m: ModalState | null) => void;
  toastState: ToastContent | null;
  toast: (msg: ToastContent["msg"], opts?: ToastOptions) => void;

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

  login: (back?: string) => Promise<void>;
  signup: (
    data: { handle: string; nick: string; interests: User["interests"] },
    back?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  withdraw: () => Promise<void>;
  updateMe: (patch: Partial<User>) => Promise<void>;

  launch: (s: Service) => Promise<void>;
  openSource: (s: Service) => void;
  copyLink: (s: Service) => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  toggleSave: (id: string) => Promise<void>;
  report: (key: string) => Promise<void>;
  countView: (s: Service) => void;

  addReview: (s: Service, role: ReviewRole, v: ReviewInput) => Promise<void>;
  updateReview: (id: string, v: ReviewInput) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  setReply: (rid: string, text: string | null) => Promise<void>;

  createService: (data: ServiceInput) => Promise<Service>;
  updateService: (id: string, patch: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  checkServiceUrl: (url: string, selfId?: string) => Promise<UrlServerCheck>;

  aiSearch: (q: string) => Promise<AiSearchResult>;
  /** AI 검색 1회 사용을 기록한다(실서비스에서는 서버가 횟수를 센다) */
  recordAiUse: () => void;
}
