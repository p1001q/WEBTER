import { DISPLAY } from "@/domain/policy";
import { CAT } from "@/domain/options";
import { normUrl } from "@/domain/validation";
import type {
  Review,
  ReviewInput,
  ReviewRole,
  Service,
  ServiceInput,
  SessionState,
  Snapshot,
  User,
} from "../types";
import type { WebterApi } from "../webterApi";
import { mockAiSearch } from "./intents";
import {
  ME_ID,
  SEED_OPENSOURCE,
  SEED_REVIEWS,
  SEED_SERVICES,
  SEED_TAKEN_HANDLES,
  SEED_USERS,
} from "./seed";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

const MEMBER_LIKES = ["s04", "s12", "s02"];
const MEMBER_SAVES = ["s04", "s05", "s08", "s14"];

/** 목업 DB 의 초기 상태를 정하는 옵션(개발 도구에서 상태를 재현할 때 쓴다) */
export interface MockOptions {
  /** 이 스냅샷의 상태로 시작한다(서버에서 받은 초기 데이터를 클라이언트 인스턴스에 그대로 옮길 때). 다른 옵션보다 우선한다 */
  snapshot?: Snapshot;
  /** 로그인한 상태로 시작할 회원 id */
  me?: string | null;
  /** 'none': 내 서비스 없음 */
  sample?: "none";
  mutate?: (services: Service[]) => Service[];
  noSaves?: boolean;
  aiUsed?: number;
  todayCount?: number;
}

export function createMockApi(opts: MockOptions = {}): WebterApi {
  const snap = opts.snapshot;
  let services = clone(snap?.services ?? SEED_SERVICES);
  let reviews = clone(snap?.reviews ?? SEED_REVIEWS);
  const users = clone(snap?.users ?? SEED_USERS);
  const opensource = clone(snap?.opensource ?? SEED_OPENSOURCE);
  const takenHandles = clone(snap?.takenHandles ?? SEED_TAKEN_HANDLES);
  if (!snap && opts.sample === "none") {
    const ids = services.filter((s) => s.owner === ME_ID).map((s) => s.id);
    services = services.filter((s) => s.owner !== ME_ID);
    reviews = reviews.filter((r) => !ids.includes(r.sid));
  }
  if (!snap && opts.mutate) services = opts.mutate(services);

  const session: SessionState = snap
    ? clone(snap.session)
    : {
        meId: opts.me ?? null,
        likes: opts.me ? [...MEMBER_LIKES] : [],
        saves: opts.me ? (opts.noSaves ? [] : [...MEMBER_SAVES]) : [],
        reported: [],
        guestReviewed: [],
        aiUsed: opts.aiUsed || 0,
        todayCount: opts.todayCount || 0,
      };

  const me = () => (session.meId ? users[session.meId] : null);
  const need = () => {
    const u = me();
    if (!u) throw new Error("로그인이 필요해요.");
    return u;
  };
  const findService = (id: string) => {
    const s = services.find((x) => x.id === id);
    if (!s) throw new Error("서비스를 찾을 수 없어요.");
    return s;
  };
  const findReview = (id: string) => {
    const r = reviews.find((x) => x.id === id);
    if (!r) throw new Error("리뷰를 찾을 수 없어요.");
    return r;
  };
  const sessionCopy = (): SessionState => clone(session);
  const bump = (
    s: Service,
    k: "views" | "clicks" | "likes" | "saves",
    d: number,
  ) => {
    s[k] = Math.max(0, s[k] + d);
  };
  const ok = async <T>(v: T): Promise<T> => clone(v);

  const toggle = async (list: string[], sid: string, k: "likes" | "saves") => {
    need();
    const s = findService(sid);
    const i = list.indexOf(sid);
    const on = i < 0;
    if (on) list.push(sid);
    else list.splice(i, 1);
    bump(s, k, on ? 1 : -1);
    return clone({ service: s, on });
  };

  return {
    bootstrap: () =>
      ok<Snapshot>({
        users,
        services,
        reviews,
        opensource,
        takenHandles,
        session,
      }),

    login: async () => {
      session.meId = ME_ID;
      session.likes = [...MEMBER_LIKES];
      session.saves = [...MEMBER_SAVES];
      return clone({ users, session });
    },
    signup: async ({ handle, nick, interests }) => {
      const id = "u_new";
      users[id] = {
        id,
        nick,
        handle,
        color: "#E3E8F0",
        bio: "",
        links: [],
        interests,
        email: "new@example.com",
      };
      session.meId = id;
      session.likes = [];
      session.saves = [];
      return clone({ users, session });
    },
    logout: async () => {
      session.meId = null;
      session.likes = [];
      session.saves = [];
      return sessionCopy();
    },
    withdraw: async () => {
      const id = need().id;
      const gone = new Set(
        services.filter((s) => s.owner === id).map((s) => s.id),
      );
      services = services.filter((s) => s.owner !== id);
      reviews = reviews
        .filter((r) => !gone.has(r.sid))
        .map((r) =>
          r.a.uid === id ? { ...r, a: { kind: "left" as const } } : r,
        );
      session.meId = null;
      session.likes = [];
      session.saves = [];
      return clone({ services, reviews, session });
    },
    updateProfile: async (patch: Partial<User>) => {
      const u = need();
      Object.assign(u, patch);
      return clone(u);
    },

    toggleLike: (sid) => toggle(session.likes, sid, "likes"),
    toggleSave: (sid) => toggle(session.saves, sid, "saves"),
    recordView: async (sid) => {
      const s = findService(sid);
      if (s.owner !== session.meId) bump(s, "views", 1);
      return clone(s);
    },
    recordClick: async (sid) => {
      const s = findService(sid);
      if (s.owner !== session.meId) bump(s, "clicks", 1);
      return clone(s);
    },
    report: async (key) => {
      if (!session.reported.includes(key)) session.reported.push(key);
    },

    addReview: async (sid: string, role: ReviewRole, v: ReviewInput) => {
      const s = findService(sid);
      const u = role === "guest" ? null : need();
      const a: Review["a"] =
        role === "guest"
          ? { kind: "guest", ip: "175.22.xx.xx" }
          : role === "maker"
            ? { kind: "maker", uid: u!.id }
            : v.anon
              ? { kind: "anon", uid: u!.id }
              : { kind: "member", uid: u!.id };
      const r: Review = {
        id: "rn" + Date.now(),
        fresh: true,
        sid: s.id,
        a,
        rate: role === "maker" ? null : role === "guest" ? "none" : v.rate,
        date: DISPLAY.demoToday,
        text: v.text,
      };
      reviews.unshift(r);
      if (role === "guest" && !session.guestReviewed.includes(sid))
        session.guestReviewed.push(sid);
      return clone(r);
    },
    updateReview: async (id, v) => {
      const r = findReview(id);
      r.rate = r.a.kind === "maker" ? null : v.rate;
      r.text = v.text;
      r.edited = true;
      if (r.a.kind !== "maker")
        r.a = { kind: v.anon ? "anon" : "member", uid: r.a.uid };
      return clone(r);
    },
    deleteReview: async (id) => {
      reviews = reviews.filter((r) => r.id !== id);
    },
    setReply: async (rid, text) => {
      const r = findReview(rid);
      r.reply = text ? { text, date: DISPLAY.demoToday } : undefined;
      return clone(r);
    },

    createService: async (input: ServiceInput) => {
      const u = need();
      const c = CAT[input.cats[0]];
      const s: Service = {
        ...input,
        id: "s" + (100 + services.length),
        owner: u.id,
        created: DISPLAY.demoToday,
        use: "live",
        stopReason: "",
        pub: "public",
        pubReason: "",
        views: 0,
        clicks: 0,
        likes: 0,
        saves: 0,
        thumb: { kind: "default", bg: c.bg, a: c.fg },
        rv: { up: 0, down: 0, none: 0 },
        sc: [0, 0, 0],
        versions: [],
      };
      services.unshift(s);
      session.todayCount += 1;
      return clone(s);
    },
    updateService: async (id, patch) => {
      const s = findService(id);
      Object.assign(s, patch);
      return clone(s);
    },
    deleteService: async (id) => {
      services = services.filter((s) => s.id !== id);
      reviews = reviews.filter((r) => r.sid !== id);
    },
    /** 접속·중복 검사 목업: 같은 주소는 중복, offline·down·unreachable 이 들어가면 접속 불가 */
    checkServiceUrl: async (url, selfId) => {
      const n = normUrl(url);
      if (services.some((s) => s.id !== selfId && normUrl(s.url) === n))
        return {
          state: "dup",
          msg: "이미 등록된 주소예요. 같은 주소는 중복 등록할 수 없어요.",
        };
      if (/(offline|down|unreachable)/.test(n))
        return {
          state: "unreachable",
          msg: "접속할 수 없어요. 배포 상태를 확인한 뒤 다시 검사하세요.",
        };
      return { state: "ok", msg: "접속을 확인했어요." };
    },

    /** 일일 횟수 제한은 서버가 강제하는 항목이다. 목업에서는 화면 스토어가 횟수를 센다. */
    aiSearch: async (q) => clone(mockAiSearch(q)),
  };
}
