import type {
  CategoryId,
  Device,
  Lang,
  Price,
  ProjectType,
  PubState,
  Service,
  ThumbSpec,
  User,
} from "../types";
import { ID_BY_CODE } from "./codes";

/** 백엔드 서비스 응답(GET /api/services). 열거형은 DB 코드값이다 */
export interface BackendService {
  id: string;
  name: string;
  tagline: string;
  description: string | null;
  url: string;
  githubUrl: string | null;
  owner: { id: string; username: string; nickname: string };
  createdAt: string;
  categories: string[];
  tags: string[];
  projectType: "TOY" | "SIDE" | "COMMERCIAL";
  devices: ("PC" | "MOBILE")[];
  priceType: "FREE" | "PAID" | "FREEMIUM";
  registrantType: "INDIVIDUAL" | "TEAM";
  teamName: string | null;
  languages: ("KO" | "EN")[];
  availability: "AVAILABLE" | "UNAVAILABLE";
  unavailableReason: string | null;
  visibility: "PUBLIC" | "TEMP_HIDDEN" | "HIDDEN";
  hiddenReason: string | null;
  iconUrl: string | null;
  thumbnailUrl: string | null;
  previewRatio: "LANDSCAPE" | "PORTRAIT";
  previewFit: "COVER" | "CONTAIN";
  previewImages: string[];
  allowGuestReviews: boolean;
  allowAnonymousReviews: boolean;
  allowAnonymousComments: boolean;
  views: number;
  clicks: number;
  likes: number;
  saves: number;
  reviews: { up: number; down: number; none: number };
  scores: { threeDays: number; week: number; month: number };
  versions: {
    id: string;
    version: string;
    title: string;
    content: string;
    createdAt: string;
  }[];
}

export interface BackendServicePage {
  items: BackendService[];
  page: number;
  size: number;
  total: number;
}

const TYPE: Record<BackendService["projectType"], ProjectType> = {
  TOY: "toy",
  SIDE: "side",
  COMMERCIAL: "pro",
};
const DEVICE: Record<BackendService["devices"][number], Device> = {
  PC: "pc",
  MOBILE: "mobile",
};
const PRICE: Record<BackendService["priceType"], Price> = {
  FREE: "free",
  PAID: "paid",
  FREEMIUM: "partial",
};
const LANG: Record<BackendService["languages"][number], Lang> = {
  KO: "ko",
  EN: "en",
};
const PUB: Record<BackendService["visibility"], PubState> = {
  PUBLIC: "public",
  TEMP_HIDDEN: "temp",
  HIDDEN: "private",
};

/** 이미지가 없는 서비스의 대표 그림(용도별 색). 실제 썸네일을 올리면 쓰이지 않는다 */
const THUMB_BY_CAT: Record<CategoryId, ThumbSpec> = {
  play: { kind: "default", bg: "#E6EFE0", a: "#3E6B4F", b: "#F2DB94" },
  life: { kind: "default", bg: "#F1E7DC", a: "#8A5A36", b: "#F7F5EF" },
  learn: { kind: "default", bg: "#E2ECEB", a: "#2F5D62", b: "#F7F5EF" },
  prod: { kind: "default", bg: "#E4E8F0", a: "#35445C", b: "#F2DB94" },
  design: { kind: "default", bg: "#F1E0E3", a: "#7A3B4A", b: "#F7F5EF" },
  util: { kind: "default", bg: "#E8E6F0", a: "#4A4470", b: "#F7F5EF" },
  dev: { kind: "default", bg: "#E3E5E8", a: "#2E3440", b: "#9CC9B0" },
  etc: { kind: "default", bg: "#EBEAE4", a: "#55524A", b: "#F7F5EF" },
};

/** 서버가 준 시각을 한국 시간 기준 YYYY-MM-DD로 바꾼다 */
export const ymd = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

export function mapService(b: BackendService): Service {
  const cats = b.categories.flatMap((c) =>
    ID_BY_CODE[c] ? [ID_BY_CODE[c]] : [],
  );
  const hasIcon = b.iconUrl !== null;
  const hasThumb = b.thumbnailUrl !== null;
  return {
    id: b.id,
    name: b.name,
    tagline: b.tagline,
    desc: b.description ?? "",
    url: b.url,
    owner: b.owner.id,
    created: ymd(b.createdAt),
    cats,
    type: TYPE[b.projectType],
    devices: b.devices.map((d) => DEVICE[d]),
    price: PRICE[b.priceType],
    team: b.registrantType === "TEAM" ? (b.teamName ?? "") : null,
    langs: b.languages.map((l) => LANG[l]),
    tags: b.tags,
    github: b.githubUrl,
    use: b.availability === "AVAILABLE" ? "live" : "stop",
    stopReason: b.unavailableReason ?? "",
    pub: PUB[b.visibility],
    pubReason: b.hiddenReason ?? "",
    hasIcon,
    hasThumb,
    iconImg: b.iconUrl,
    thumbImg: b.thumbnailUrl,
    previews:
      b.previewImages.length > 0
        ? {
            ratio: b.previewRatio === "PORTRAIT" ? "port" : "land",
            fit: b.previewFit === "CONTAIN" ? "contain" : "cover",
            count: b.previewImages.length,
            imgs: b.previewImages,
          }
        : null,
    allowGuest: b.allowGuestReviews,
    allowAnon: b.allowAnonymousReviews,
    allowAnonComment: b.allowAnonymousComments,
    views: b.views,
    clicks: b.clicks,
    likes: b.likes,
    saves: b.saves,
    rv: { up: b.reviews.up, down: b.reviews.down, none: b.reviews.none },
    sc: [b.scores.threeDays, b.scores.week, b.scores.month],
    versions: b.versions.map((v) => ({
      id: v.id,
      ver: v.version,
      title: v.title,
      body: v.content,
      date: ymd(v.createdAt),
    })),
    thumb: THUMB_BY_CAT[cats[0] ?? "etc"],
  };
}

/** 제작자 정보(공개 항목만). 소개·링크는 프로필 API를 붙일 때 채운다 */
export const ownerToUser = (b: BackendService): User => ({
  id: b.owner.id,
  nick: b.owner.nickname,
  handle: b.owner.username,
  color: "#E3E8F0",
  bio: "",
  links: [],
});

const PAGE_SIZE = 100;
/** 한 번에 모으는 서비스의 상한(목록·정렬을 화면에서 처리하는 동안의 안전장치) */
const MAX_SERVICES = 1000;

/**
 * 공개 서비스 전체를 모은다. 지금은 필터·정렬·검색을 화면에서 처리하므로 모두 받아 오고,
 * 서버 쪽 조건·페이지 조회는 서비스가 늘어나면 화면 단위로 옮긴다.
 */
export async function fetchPublicServices(
  base: string,
): Promise<BackendService[]> {
  const out: BackendService[] = [];
  for (let page = 0; out.length < MAX_SERVICES; page++) {
    const res = await fetch(
      `${base}/api/services?size=${PAGE_SIZE}&page=${page}`,
      { cache: "no-store", signal: AbortSignal.timeout(10_000) },
    );
    const body = (await res.json()) as {
      success: boolean;
      data: BackendServicePage;
    };
    if (!res.ok || !body.success)
      throw new Error("서비스 목록을 불러오지 못했어요.");
    out.push(...body.data.items);
    if ((page + 1) * PAGE_SIZE >= body.data.total) break;
  }
  return out;
}
