/* WEBTER — 도메인 타입. 프론트가 데이터 접근 계약(WebterApi)으로 주고받는 값의 모양이며, 백엔드 HTTP API 명세를 확정한 것은 아니다. */

export type CategoryId =
  "play" | "life" | "learn" | "prod" | "design" | "util" | "dev" | "etc";
export type ProjectType = "toy" | "side" | "pro";
export type Device = "pc" | "mobile";
export type Price = "free" | "paid" | "partial";
export type OwnerKind = "solo" | "team";
export type Lang = "ko" | "en";
/** 운영 상태: 제작자가 바꾼다 */
export type UseState = "live" | "stop";
/** 공개 상태: 운영자가 정한다. public 일 때는 화면에 표시하지 않는다 */
export type PubState = "public" | "private" | "temp";
export type LinkKind = "github" | "instagram" | "velog" | "blog" | "portfolio";
export type Grade =
  "vpos" | "pos" | "mpos" | "mixed" | "mneg" | "neg" | "vneg" | "few";
export type ThumbKind =
  | "game"
  | "study"
  | "calendar"
  | "palette"
  | "pdf"
  | "typing"
  | "api"
  | "travel"
  | "books"
  | "timer"
  | "poll"
  | "image"
  | "puzzle"
  | "board"
  | "flash"
  | "code"
  | "roulette"
  | "default";

export interface ThumbSpec {
  kind: ThumbKind;
  bg: string;
  a: string;
  b?: string;
  colors?: string[];
}

export interface PreviewSpec {
  ratio: "land" | "port";
  fit: "cover" | "contain";
  count: number;
  imgs?: string[];
}

export interface Version {
  id: string;
  ver: string;
  title: string;
  body: string;
  date: string;
}

export interface ReviewCounts {
  up: number;
  down: number;
  none: number;
}
/** 점수 집계 구간: [최근 3일, 주간, 월간] */
export type ScoreBuckets = [number, number, number];

export interface Service {
  id: string;
  name: string;
  tagline: string;
  desc: string;
  url: string;
  owner: string;
  created: string;
  cats: CategoryId[];
  type: ProjectType;
  devices: Device[];
  price: Price;
  team: string | null;
  langs: Lang[];
  tags: string[];
  github: string | null;
  use: UseState;
  stopReason: string;
  pub: PubState;
  pubReason: string;
  hasIcon: boolean;
  hasThumb: boolean;
  iconImg?: string | null;
  thumbImg?: string | null;
  previews: PreviewSpec | null;
  allowGuest: boolean;
  allowAnon: boolean;
  /** 회원이 댓글마다 익명으로 남길 수 있게 할지 */
  allowAnonComment: boolean;
  views: number;
  clicks: number;
  likes: number;
  saves: number;
  rv: ReviewCounts;
  sc: ScoreBuckets;
  versions: Version[];
  thumb: ThumbSpec;
}

export interface User {
  id: string;
  nick: string;
  handle: string;
  color: string;
  bio: string;
  email?: string;
  links: [LinkKind, string][];
  interests?: CategoryId[];
  avatarImg?: string | null;
  /** 아이디를 바꾼 날짜(YYYY-MM-DD). 최근 변경 횟수 제한에 쓴다 */
  handleChanges?: string[];
}

export type ReviewAuthorKind = "member" | "anon" | "guest" | "left" | "maker";
export type Rate = "up" | "down" | "none";

export interface Review {
  id: string;
  sid: string;
  /** 작성자. member·anon·maker 는 uid, guest 는 가림 처리된 ip */
  a: { kind: ReviewAuthorKind; uid?: string; ip?: string };
  rate: Rate | null;
  date: string;
  text: string;
  reply?: { text: string; date: string };
  fresh?: boolean;
  edited?: boolean;
}

export type CommentAuthorKind = "member" | "anon" | "left";

/** 서비스 상세의 댓글. 리뷰와 별개이고 평가·집계에 영향을 주지 않는다 */
export interface Comment {
  id: string;
  sid: string;
  /** 답글이면 원 댓글의 id. 답글은 한 단계까지만 둔다 */
  parent: string | null;
  /** 작성자. anon 도 본인 확인을 위해 uid 를 가진다(화면에는 보이지 않는다) */
  a: { kind: CommentAuthorKind; uid?: string };
  date: string;
  text: string;
  edited?: boolean;
  /** 답글이 달린 댓글을 지우면 자리만 남긴다 */
  deleted?: boolean;
  fresh?: boolean;
}
export interface CommentInput {
  text: string;
  anon?: boolean;
}

export type ReviewRole = "member" | "maker" | "guest";
export interface ReviewInput {
  rate: Rate | null;
  text: string;
  anon?: boolean;
}

/** 서비스 등록·수정 폼이 서버로 보내는 값 */
export type ServiceInput = Pick<
  Service,
  | "name"
  | "tagline"
  | "url"
  | "cats"
  | "type"
  | "devices"
  | "price"
  | "team"
  | "desc"
  | "tags"
  | "github"
  | "langs"
  | "hasIcon"
  | "hasThumb"
  | "previews"
  | "allowGuest"
  | "allowAnon"
  | "allowAnonComment"
> & { iconImg: string | null; thumbImg: string | null };

export interface SessionState {
  meId: string | null;
  likes: string[];
  saves: string[];
  /** 'review:r2' 처럼 type:id 형식 */
  reported: string[];
  guestReviewed: string[];
  aiUsed: number;
  todayCount: number;
}

/** 알림 종류: 내 서비스에 리뷰·댓글, 내 댓글에 답글, 내 리뷰에 제작자 답글, 서비스 임시 비공개 */
export type NotificationKind =
  "review" | "comment" | "reply" | "maker-reply" | "hidden";
export interface Notification {
  id: string;
  kind: NotificationKind;
  /** 알림을 일으킨 회원(운영 처리 알림에는 없다) */
  actor?: string;
  sid: string;
  date: string;
  read: boolean;
  /** 리뷰·댓글·답글 내용 일부 */
  quote?: string;
}

export interface Snapshot {
  users: Record<string, User>;
  services: Service[];
  reviews: Review[];
  comments: Comment[];
  notifications: Notification[];
  /** 이미 사용 중인 아이디 목록(실서비스에서는 중복 확인 API로 대체) */
  takenHandles: string[];
  session: SessionState;
}

/** 약관·확인 문구의 종류와 버전. 가입 요청에 동의한 버전을 실어 보낸다 */
export interface PolicyVersion {
  documentType: string;
  version: string;
}

export interface SignupInput {
  handle: string;
  nick: string;
  interests: CategoryId[];
  /** 실제 가입에서 동의한 문서 버전. 목업은 쓰지 않는다 */
  consents?: PolicyVersion[];
}

export interface AiSearchResult {
  chips: string[];
  picks: [serviceId: string, reason: string][];
}

export type UrlServerCheck =
  | { state: "ok"; msg: string }
  | { state: "dup"; msg: string }
  | { state: "unreachable"; msg: string };
