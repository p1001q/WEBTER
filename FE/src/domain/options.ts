import type {
  CategoryId,
  Device,
  Lang,
  LinkKind,
  OwnerKind,
  Price,
  ProjectType,
  PubState,
  UseState,
} from "@/api/types";

export interface Category {
  id: CategoryId;
  label: string;
  bg: string;
  fg: string;
}

export const CATEGORIES: Category[] = [
  { id: "play", label: "놀이", bg: "#E6EFE0", fg: "#3E6B4F" },
  { id: "life", label: "생활", bg: "#F1E9DA", fg: "#7A5A2E" },
  { id: "learn", label: "학습", bg: "#E2ECEB", fg: "#2F5D62" },
  { id: "prod", label: "생산성", bg: "#E4E8F0", fg: "#35445C" },
  { id: "design", label: "디자인·창작", bg: "#F3EADF", fg: "#9A5236" },
  { id: "util", label: "유틸리티", bg: "#ECEAE4", fg: "#555555" },
  { id: "dev", label: "개발자 도구", bg: "#DCE1E8", fg: "#2A3749" },
  { id: "etc", label: "기타", bg: "#EFEDE7", fg: "#6B6B6B" },
];
export const CAT = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

type Opts<T extends string> = [T, string][];
export const OPT: {
  type: Opts<ProjectType>;
  devices: Opts<Device>;
  price: Opts<Price>;
  owner: Opts<OwnerKind>;
  langs: Opts<Lang>;
  use: Opts<UseState>;
} = {
  type: [
    ["toy", "토이 프로젝트"],
    ["side", "사이드 프로젝트"],
    ["pro", "정식 서비스"],
  ],
  devices: [
    ["pc", "PC"],
    ["mobile", "모바일"],
  ],
  price: [
    ["free", "무료"],
    ["paid", "유료"],
    ["partial", "일부 유료"],
  ],
  owner: [
    ["solo", "개인"],
    ["team", "팀"],
  ],
  langs: [
    ["ko", "한국어"],
    ["en", "영어"],
  ],
  use: [
    ["live", "사용 가능"],
    ["stop", "사용 불가능"],
  ],
};
const labels = <T extends string>(o: Opts<T>) =>
  Object.fromEntries(o) as Record<T, string>;
export const OPTL = {
  type: labels(OPT.type),
  devices: labels(OPT.devices),
  price: labels(OPT.price),
  owner: labels(OPT.owner),
  langs: labels(OPT.langs),
  use: labels(OPT.use),
};
export const TYPE_SHORT: Record<ProjectType, string> = {
  toy: "토이",
  side: "사이드",
  pro: "정식 서비스",
};

export const LINK_ICON: Record<LinkKind, string> = {
  github: "github",
  instagram: "instagram",
  velog: "pen",
  blog: "globe",
  portfolio: "briefcase",
};
export const LINK_LABEL: Record<LinkKind, string> = {
  github: "GitHub",
  instagram: "Instagram",
  velog: "Velog",
  blog: "블로그",
  portfolio: "포트폴리오",
};

export const STATE_LABEL: Record<UseState | PubState, string> = {
  live: "사용 가능",
  stop: "사용 불가능",
  private: "비공개",
  temp: "임시 비공개",
  public: "공개",
};

export const SEARCH_EXAMPLES = [
  "친구와 10분 정도 즐길 수 있는 웹게임",
  "공부 시간을 관리해 주는 웹 서비스",
  "사진 배경을 제거하는 사이트",
  "웹에서 바로 쓰는 디자인 도구",
];
