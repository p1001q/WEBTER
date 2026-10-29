"use client";

import { useRouter } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createApi } from "@/api";
import type {
  Review,
  Service,
  SessionState,
  Snapshot,
  User,
} from "@/api/types";
import type { ToastContent } from "@/components/ui/Toast";
import { reviewAgg } from "@/domain/review";
import {
  pathFor,
  safeBackPath,
  type RouteName,
  type RouteParams,
} from "@/lib/routes";
import { WtCtx } from "./context";
import { RouteWatcher } from "./RouteWatcher";
import type { ModalState, ToastOptions, ViewMode, WtStore } from "./types";

const MOBILE_MAX = 560;
const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};

/**
 * 서버 layout 이 받아 둔 snapshot 으로 앱 상태를 시작한다. 초기 상태는 렌더링 첫 순간부터 있으므로
 * 화면을 숨기고 기다리지 않는다. API 인스턴스(mock DB)는 provider 마다 따로 만든다.
 */
export function WtProvider({
  snapshot: snap,
  children,
}: {
  snapshot: Snapshot;
  children: ReactNode;
}) {
  const router = useRouter();
  const [api] = useState(() => createApi({ snapshot: snap }));

  const [services, setServices] = useState<Service[]>(snap.services);
  const [reviews, setReviews] = useState<Review[]>(snap.reviews);
  const [users, setUsers] = useState<Record<string, User>>(snap.users);
  const [meId, setMeId] = useState<string | null>(snap.session.meId);
  const [likes, setLikes] = useState(() => new Set(snap.session.likes));
  const [saves, setSaves] = useState(() => new Set(snap.session.saves));
  const [reported, setReported] = useState(
    () => new Set(snap.session.reported),
  );
  const [guestReviewed, setGuestReviewed] = useState(
    () => new Set(snap.session.guestReviewed),
  );
  const [aiUsed, setAiUsed] = useState(snap.session.aiUsed);
  const [todayCount, setTodayCount] = useState(snap.session.todayCount);

  const [side, setSide] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toastState, setToastState] = useState<ToastContent | null>(null);
  const [view, setView] = useState<ViewMode>("card");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const timer = toastTimer;
    return () => clearTimeout(timer.current);
  }, []);

  const isMobile = useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth <= MOBILE_MAX,
    () => false,
  );

  const closeOverlays = useCallback(() => {
    setModal(null);
    setSide(false);
  }, []);

  // 앱 안에서 이동한 횟수(Navigation API 가 없는 브라우저의 back() 대체 판단용).
  // 뒤로 가기(popstate)는 한 칸 줄이고, replace 는 세지 않는다. 앞으로 가기는 구분할 수 없어
  // 실제보다 적게 셀 수 있지만, 그 오차는 앱 밖으로 나가지 않고 홈으로 가는 쪽이다.
  const navCount = useRef(0);
  const popped = useRef(false);
  const replaced = useRef(false);
  useEffect(() => {
    const h = () => {
      popped.current = true;
      closeOverlays();
    };
    window.addEventListener("popstate", h);
    return () => window.removeEventListener("popstate", h);
  }, [closeOverlays]);
  // 주소가 어떻게 바뀌었든(Link·키보드·코드) 열려 있던 모달·사이드바는 닫는다
  const onRouteChange = useCallback(() => {
    closeOverlays();
    if (popped.current) {
      popped.current = false;
      navCount.current = Math.max(0, navCount.current - 1);
    } else if (replaced.current) replaced.current = false;
    else navCount.current += 1;
  }, [closeOverlays]);

  const me = meId ? (users[meId] ?? null) : null;

  const toast = useCallback(
    (msg: ToastContent["msg"], opts: ToastOptions = {}) => {
      clearTimeout(toastTimer.current);
      setToastState({ msg, ...opts });
      toastTimer.current = setTimeout(
        () => setToastState(null),
        opts.err ? 5200 : 2800,
      );
    },
    [],
  );

  const currentPath = useCallback(
    () => window.location.pathname + window.location.search,
    [],
  );
  const goPath = useCallback(
    (path: string, replace = false) => {
      closeOverlays();
      if (replace) {
        // 같은 주소로의 replace 는 주소가 바뀌지 않아 표시가 남지 않도록 건너뛴다
        replaced.current =
          path !== window.location.pathname + window.location.search;
        router.replace(path);
      } else router.push(path);
    },
    [router, closeOverlays],
  );
  const go = useCallback(
    (
      name: RouteName,
      params: RouteParams = {},
      opts: { replace?: boolean } = {},
    ) => goPath(pathFor(name, params), opts.replace),
    [goPath],
  );
  const back = useCallback(() => {
    // 이전 항목이 같은 사이트의 화면일 때만 뒤로 간다. Navigation API 는 브라우저의 기록 위치를
    // 그대로 보므로 뒤로·앞으로·replace 가 섞여도 정확하다. 없는 브라우저에서는 앱 안 이동 횟수가 있거나
    // 이 문서로 들어오기 직전 화면이 같은 출처일 때만 뒤로 가고, 아니면 홈으로 보낸다.
    const nav = (window as { navigation?: { canGoBack?: boolean } }).navigation;
    const sameOriginReferrer = () => {
      try {
        return (
          !!document.referrer &&
          new URL(document.referrer).origin === window.location.origin
        );
      } catch {
        return false;
      }
    };
    const canGoBack =
      typeof nav?.canGoBack === "boolean"
        ? nav.canGoBack
        : navCount.current > 0 || sameOriginReferrer();
    if (canGoBack) {
      closeOverlays();
      router.back();
    } else go("home");
  }, [router, closeOverlays, go]);

  const svc = useCallback(
    (id: string | undefined) => services.find((s) => s.id === id),
    [services],
  );
  const isOwner = (s: Service) => !!me && s.owner === me.id;

  const applyService = (s: Service) =>
    setServices((l) => l.map((x) => (x.id === s.id ? s : x)));
  const applyReview = (r: Review) =>
    setReviews((l) => l.map((x) => (x.id === r.id ? r : x)));
  const applySession = (s: SessionState) => {
    setMeId(s.meId);
    setLikes(new Set(s.likes));
    setSaves(new Set(s.saves));
    setReported(new Set(s.reported));
    setGuestReviewed(new Set(s.guestReviewed));
    setTodayCount(s.todayCount);
  };
  const flip = (set: Set<string>, id: string, on: boolean) => {
    const n = new Set(set);
    if (on) n.add(id);
    else n.delete(id);
    return n;
  };

  const store: WtStore = {
    me,
    users,
    services,
    reviews,
    likes,
    saves,
    reported,
    guestReviewed,
    aiUsed,
    todayCount,
    opensource: snap.opensource,
    takenHandles: snap.takenHandles,
    publicServices: services.filter((s) => s.pub === "public"),
    view,
    setView,
    isMobile,
    side,
    setSide,
    modal,
    setModal,
    toastState,
    toast,
    currentPath,
    go,
    back,
    svc,
    agg: (s) => reviewAgg(s, reviews),
    requireLogin: (fn, reason) => {
      if (me) fn();
      else setModal({ type: "login", reason });
    },

    login: async (backPath) => {
      const r = await api.login();
      setUsers(r.users);
      applySession(r.session);
      const to = safeBackPath(backPath);
      if (to) goPath(to);
      else go("home");
      toast(to ? "로그인했어요. 보던 페이지로 돌아왔어요." : "로그인했어요.");
    },
    signup: async (data, backPath) => {
      const r = await api.signup({
        handle: data.handle,
        nick: data.nick,
        interests: data.interests ?? [],
      });
      setUsers(r.users);
      applySession(r.session);
      const to = safeBackPath(backPath);
      if (to) goPath(to);
      else go("home");
      toast("가입을 마쳤어요. 보던 페이지로 돌아갑니다.");
    },
    logout: async () => {
      applySession(await api.logout());
      go("home");
      toast("로그아웃했어요.");
    },
    withdraw: async () => {
      const r = await api.withdraw();
      setServices(r.services);
      setReviews(r.reviews);
      applySession(r.session);
      go("home");
      toast("탈퇴 처리했어요. (데모: 실제 계정은 삭제되지 않아요)");
    },
    updateMe: async (patch) => {
      const u = await api.updateProfile(patch);
      setUsers((us) => ({ ...us, [u.id]: u }));
    },

    launch: async (s) => {
      if (s.use !== "live") return;
      const mine = isOwner(s);
      toast(
        <span>
          데모 — 실제로는{" "}
          <b className="font-mono font-medium">
            {s.url.replace("https://", "")}
          </b>{" "}
          이(가) 새 탭에서 열려요.
          {mine ? " 본인 클릭은 집계하지 않아요." : " 이용하기 클릭 +1"}
        </span>,
      );
      if (!mine) applyService(await api.recordClick(s.id));
    },
    openSource: () =>
      toast(
        <span>
          데모 — 실제로는 GitHub 저장소가 새 탭에서 열려요. 소스 보기는 이용하기
          집계에 넣지 않아요.
        </span>,
      ),
    copyLink: async (s) => {
      const url = window.location.origin + pathFor("detail", { id: s.id });
      let ok = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
          ok = true;
        }
      } catch {
        ok = false;
      }
      if (!ok) {
        try {
          const ta = document.createElement("textarea");
          ta.value = url;
          ta.setAttribute("readonly", "");
          ta.style.position = "absolute";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          ok = document.execCommand("copy");
          document.body.removeChild(ta);
        } catch {
          ok = false;
        }
      }
      if (ok) toast("링크를 복사했어요.");
      else
        toast(
          <span>
            링크를 복사하지 못했어요. 주소를 직접 복사해 주세요:{" "}
            <span className="font-mono select-all">{url}</span>
          </span>,
          { err: true },
        );
    },
    toggleLike: async (id) => {
      const r = await api.toggleLike(id);
      applyService(r.service);
      setLikes((l) => flip(l, id, r.on));
      toast(r.on ? "좋아요를 눌렀어요." : "좋아요를 취소했어요.");
    },
    toggleSave: async (id) => {
      const r = await api.toggleSave(id);
      applyService(r.service);
      setSaves((l) => flip(l, id, r.on));
      toast(
        r.on
          ? "저장했어요. 마이페이지에서 다시 볼 수 있어요."
          : "저장을 취소했어요.",
        r.on
          ? { action: "보기", onAction: () => go("mypage", { tab: "saved" }) }
          : {},
      );
    },
    report: async (key) => {
      await api.report(key);
      setReported((r) => new Set([...r, key]));
    },
    countView: (s) => {
      if (!isOwner(s)) api.recordView(s.id).then(applyService);
    },

    addReview: async (s, role, v) => {
      const r = await api.addReview(s.id, role, v);
      setReviews((l) => [r, ...l]);
      if (role === "guest") setGuestReviewed((g) => new Set([...g, s.id]));
      toast("리뷰를 남겼어요.");
    },
    updateReview: async (id, v) => {
      applyReview(await api.updateReview(id, v));
      toast("리뷰를 수정했어요.");
    },
    deleteReview: async (id) => {
      await api.deleteReview(id);
      setReviews((l) => l.filter((r) => r.id !== id));
      toast("리뷰를 삭제했어요.");
    },
    setReply: async (rid, text) => {
      applyReview(await api.setReply(rid, text));
      toast(text ? "답글을 등록했어요." : "답글을 삭제했어요.");
    },

    createService: async (data) => {
      const s = await api.createService(data);
      setServices((l) => [s, ...l]);
      setTodayCount((c) => c + 1);
      return s;
    },
    updateService: async (id, patch) => {
      applyService(await api.updateService(id, patch));
    },
    deleteService: async (id) => {
      await api.deleteService(id);
      setServices((l) => l.filter((s) => s.id !== id));
      setReviews((l) => l.filter((r) => r.sid !== id));
      toast("서비스와 리뷰를 삭제했어요.");
    },
    checkServiceUrl: (url, selfId) => api.checkServiceUrl(url, selfId),

    aiSearch: (q) => api.aiSearch(q),
    recordAiUse: () => setAiUsed((n) => n + 1),
  };

  return (
    <WtCtx.Provider value={store}>
      <Suspense fallback={null}>
        <RouteWatcher onChange={onRouteChange} />
      </Suspense>
      {children}
    </WtCtx.Provider>
  );
}
