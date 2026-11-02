import type {
  CategoryId,
  Device,
  Lang,
  OwnerKind,
  Price,
  ProjectType,
  Service,
} from "@/api/types";

export interface FormState {
  name: string;
  tagline: string;
  url: string;
  cats: CategoryId[];
  type: ProjectType | "";
  devices: Device[];
  price: Price | "";
  owner: OwnerKind | "";
  team: string;
  desc: string;
  tags: string[];
  github: string;
  langs: Lang[];
  iconImg: string | null;
  thumbImg: string | null;
  pv: string[];
  pvRatio: "land" | "port";
  pvFit: "cover" | "contain";
  allowGuest: boolean;
  allowAnon: boolean;
  allowAnonComment: boolean;
  agree: boolean;
}

export const EMPTY_FORM: FormState = {
  name: "",
  tagline: "",
  url: "",
  cats: [],
  type: "",
  devices: [],
  price: "",
  owner: "",
  team: "",
  desc: "",
  tags: [],
  github: "",
  langs: ["ko"],
  iconImg: null,
  thumbImg: null,
  pv: [],
  pvRatio: "land",
  pvFit: "cover",
  allowGuest: false,
  allowAnon: false,
  allowAnonComment: false,
  agree: false,
};

export type UrlStateName =
  "idle" | "checking" | "ok" | "dup" | "unreachable" | "format" | "pass";
export interface UrlSt {
  state: UrlStateName;
  msg?: string;
}
export const URL_MSG: Record<string, string> = {
  idle: "배포된 서비스의 https 주소를 입력하고 접속 검사를 눌러 주세요.",
  checking: "접속 가능 여부를 확인하는 중이에요…",
};
export const URL_SAMPLES: [string, string][] = [
  ["접속 가능", "https://my-new-app.example.com"],
  ["접속 불가", "https://offline-app.example.com"],
  ["형식 오류", "http://my-app.example.com"],
  ["소스 보관 사이트", "https://github.com/dawn-code-demo/app"],
  ["중복", "https://duel.example.com"],
];

export type ArrayKey = "cats" | "devices" | "langs";

/** 카드 미리보기용 빈 서비스 */
export const BLANK_PREVIEW: Service = {
  id: "preview",
  name: "",
  tagline: "",
  desc: "",
  url: "",
  owner: "",
  created: "",
  cats: ["etc"],
  type: "side",
  devices: [],
  price: "free",
  team: null,
  langs: ["ko"],
  tags: [],
  github: null,
  use: "live",
  stopReason: "",
  pub: "public",
  pubReason: "",
  hasIcon: false,
  hasThumb: false,
  previews: null,
  allowGuest: false,
  allowAnon: false,
  allowAnonComment: false,
  views: 0,
  clicks: 0,
  likes: 0,
  saves: 0,
  rv: { up: 0, down: 0, none: 0 },
  sc: [0, 0, 0],
  versions: [],
  thumb: { kind: "default", bg: "#EFEDE7", a: "#35445C" },
};

/** 수정 화면의 처음 값: 등록된 서비스에서 채운다 */
export function fromService(src: Service): FormState {
  return {
    ...EMPTY_FORM,
    name: src.name,
    tagline: src.tagline,
    url: src.url,
    cats: [...src.cats],
    type: src.type,
    devices: [...src.devices],
    price: src.price,
    owner: src.team ? "team" : "solo",
    team: src.team || "",
    desc: src.desc,
    tags: [...src.tags],
    github: src.github || "",
    langs: [...src.langs],
    iconImg: src.iconImg || null,
    thumbImg: src.thumbImg || null,
    pv: src.previews?.imgs ? [...src.previews.imgs] : [],
    pvRatio: src.previews ? src.previews.ratio : "land",
    pvFit: src.previews ? src.previews.fit : "cover",
    allowGuest: src.allowGuest,
    allowAnon: src.allowAnon,
    allowAnonComment: src.allowAnonComment,
    agree: true,
  };
}
