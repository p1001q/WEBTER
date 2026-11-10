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
import {
  fetchSession,
  googleLoginUrl,
  memberToUser,
  submitLogout,
  submitProfile,
  submitSignup,
  submitWithdraw,
} from "@/api/auth/authApi";
import { realAuth } from "@/api/auth/config";
import { ApiError, failureText, toApiError } from "@/api/errors";
import type {
  Comment,
  Notification,
  Review,
  Service,
  SessionState,
  Snapshot,
  User,
} from "@/api/types";
import type { WebterApi } from "@/api/webterApi";
import type { ToastContent } from "@/components/ui/Toast";
import { FILTER_DEFAULT, type FilterState } from "@/domain/filter";
import { gradeOf, reviewAgg } from "@/domain/review";
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
  wrapApi,
  children,
}: {
  snapshot: Snapshot;
  /** 개발 도구가 API 호출에 지연·실패를 끼워 넣을 때만 쓴다 */
  wrapApi?: (api: WebterApi) => WebterApi;
  children: ReactNode;
}) {
  const router = useRouter();
  const [api] = useState(() => {
    const base = createApi({ snapshot: snap });
    return wrapApi ? wrapApi(base) : base;
  });

  const [services, setServices] = useState<Service[]>(snap.services);
  const [reviews, setReviews] = useState<Review[]>(snap.reviews);
  const [comments, setComments] = useState<Comment[]>(snap.comments);
  const [notifications, setNotifications] = useState<Notification[]>(
    snap.notifications,
  );
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
  /** 의견 없이 추천·비추천만 누른 평가(서비스 id → 평가). 리뷰 목록에는 오르지 않고 집계에만 들어간다 */
  const [votes, setVotes] = useState<Record<string, "up" | "down">>({});
  const [aiUsed, setAiUsed] = useState(snap.session.aiUsed);
  const [todayCount, setTodayCount] = useState(snap.session.todayCount);

  const [side, setSide] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toastState, setToastState] = useState<ToastContent | null>(null);
  const [viewPref, setView] = useState<ViewMode | null>(null);
  /** 트렌딩·인기·최신이 함께 쓰는 필터. 탭을 옮겨도, 사이드바에서 골라도 이어진다 */
  const [listFilter, setListFilter] = useState<FilterState>(FILTER_DEFAULT);
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
  // 보기 방식을 고르기 전에는 모바일은 목록형, 데스크톱은 카드형이다
  const view: ViewMode = viewPref ?? (isMobile ? "list" : "card");

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

  // 응답을 받지 못한 호출이 있거나 브라우저가 오프라인이면 켜 두고, 다음 호출이 성공하거나 연결이 돌아오면 끈다
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    // 이미 오프라인인 채로 열렸다면 이벤트가 오지 않으므로 지금 상태를 반영한다
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 상태는 마운트 뒤에만 읽을 수 있다(서버 렌더링과 어긋나지 않게)
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  /** API 호출을 감싼다. 성공하면 연결 문제 표시를 걷고, 실패하면 공통 처리(연결 배너·로그인 만료 모달)를 한 뒤 다시 던진다 */
  const call = async <T,>(run: () => Promise<T>): Promise<T> => {
    try {
      const r = await run();
      setOffline(false);
      return r;
    } catch (e) {
      const err = toApiError(e);
      // 서버가 응답했다면(오류 응답이라도) 연결은 되어 있는 것이다
      setOffline(err.kind === "network");
      if (err.kind === "auth") setModal({ type: "session" });
      throw err;
    }
  };
  /** 쓰기 동작. 실패하면 이유에 맞는 안내를 띄우고 false 를 돌려준다. 호출한 쪽은 false 면 모달·입력값을 그대로 둔다 */
  const act = async (
    what: string,
    run: () => Promise<void>,
  ): Promise<boolean> => {
    try {
      await call(run);
      return true;
    } catch (e) {
      const err = toApiError(e);
      // 로그인 만료는 모달이 안내한다
      if (err.kind !== "auth") toast(failureText(what, err), { err: true });
      return false;
    }
  };

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

  const myReviewOf = (sid: string) =>
    me
      ? reviews.find(
          (r) =>
            r.sid === sid &&
            r.a.uid === me.id &&
            (r.a.kind === "member" || r.a.kind === "anon"),
        )
      : undefined;
  const applyService = (s: Service) =>
    setServices((l) => l.map((x) => (x.id === s.id ? s : x)));
  const applyReview = (r: Review) =>
    setReviews((l) => l.map((x) => (x.id === r.id ? r : x)));
  // 늦게 도착한 응답이 로그아웃·탈퇴 뒤의 화면에 이전 회원의 데이터를 넣지 않도록 현재 회원을 따로 들고 있는다
  const meIdRef = useRef<string | null>(null);
  const applySession = useCallback((s: SessionState) => {
    meIdRef.current = s.meId;
    setMeId(s.meId);
    setLikes(new Set(s.likes));
    setSaves(new Set(s.saves));
    setReported(new Set(s.reported));
    setGuestReviewed(new Set(s.guestReviewed));
    setTodayCount(s.todayCount);
    setVotes({});
  }, []);

  // 실제 로그인을 쓸 때는 첫 화면을 그린 뒤 서버 세션을 확인해 로그인 상태를 되살린다.
  // 확인이 끝나기 전에는 로그인이 필요한 화면이 로그인 안내를 띄우지 않도록 sessionReady 로 기다리게 한다.
  const [sessionReady, setSessionReady] = useState(!realAuth);
  useEffect(() => {
    if (!realAuth) return;
    let live = true;
    (async () => {
      try {
        const s = await fetchSession();
        if (!live) return;
        const r = await api.adoptMember(
          s.status === "MEMBER" ? memberToUser(s.member) : null,
        );
        if (!live) return;
        setUsers(r.users);
        applySession(r.session);
        if (s.status === "MEMBER") {
          // 공개 목록에 없는 내 서비스(비공개 상태 등)도 내 서비스 관리·마이페이지에 보이게 한다
          void (async () => {
            try {
              const mine = await api.myServices();
              // 요청하는 사이 로그아웃·탈퇴했거나 다른 회원으로 바뀌었으면 반영하지 않는다
              if (
                !live ||
                meIdRef.current === null ||
                !mine.every((m) => m.owner === meIdRef.current)
              )
                return;
              const ids = new Set(mine.map((m) => m.id));
              setServices((l) => [...mine, ...l.filter((x) => !ids.has(x.id))]);
            } catch {
              // 내 서비스를 못 받아도 로그인 복원은 그대로 둔다(공개 서비스는 이미 보인다)
            }
          })();
        }
      } catch {
        // 저장된 목업 회원 상태가 서버 확인 실패 뒤에 남지 않도록 비운다
        if (live) {
          const r = await api.adoptMember(null);
          if (live) applySession(r.session);
        }
      } finally {
        if (live) setSessionReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [api, applySession]);
  const flip = (set: Set<string>, id: string, on: boolean) => {
    const n = new Set(set);
    if (on) n.add(id);
    else n.delete(id);
    return n;
  };

  const loginMock = (backPath?: string) =>
    act("로그인하지", async () => {
      const r = await api.login();
      setUsers(r.users);
      applySession(r.session);
      const to = safeBackPath(backPath);
      if (to) goPath(to);
      else go("home");
      toast(to ? "로그인했어요. 보던 페이지로 돌아왔어요." : "로그인했어요.");
    });

  const store: WtStore = {
    me,
    users,
    services,
    reviews,
    comments,
    notifications,
    readNotification: (id) =>
      setNotifications((l) =>
        l.map((n) => (n.id === id ? { ...n, read: true } : n)),
      ),
    readAllNotifications: () =>
      setNotifications((l) => l.map((n) => ({ ...n, read: true }))),
    deleteNotification: (id) =>
      setNotifications((l) => l.filter((n) => n.id !== id)),
    clearNotifications: () => setNotifications([]),
    likes,
    saves,
    reported,
    guestReviewed,
    aiUsed,
    todayCount,
    takenHandles: realAuth ? [] : snap.takenHandles,
    sessionReady,
    publicServices: services.filter((s) => s.pub === "public"),
    view,
    setView,
    listFilter,
    setListFilter,
    isMobile,
    side,
    setSide,
    modal,
    setModal,
    toastState,
    toast,
    offline,
    dismissOffline: () => setOffline(false),
    currentPath,
    go,
    back,
    svc,
    agg: (s) => {
      const base = reviewAgg(s, reviews);
      const v =
        me && !isOwner(s) && !myReviewOf(s.id) ? votes[s.id] : undefined;
      if (!v) return base;
      const up = base.up + (v === "up" ? 1 : 0);
      const down = base.down + (v === "down" ? 1 : 0);
      return { ...base, up, down, ...gradeOf(up, down) };
    },
    myVote: (sid) => {
      const r = myReviewOf(sid);
      if (r) return r.rate === "up" || r.rate === "down" ? r.rate : null;
      return votes[sid] ?? null;
    },
    vote: (sid, rate) =>
      store.setVote(sid, store.myVote(sid) === rate ? null : rate),
    // 이미 리뷰가 있으면 평가는 리뷰를 수정해서만 바꾼다(호출하는 쪽이 수정 창을 연다)
    setVote: (sid, next) => {
      if (myReviewOf(sid)) return;
      setVotes((m) => {
        const n = { ...m };
        if (next) n[sid] = next;
        else delete n[sid];
        return n;
      });
    },
    myReview: (sid) => myReviewOf(sid),
    requireLogin: (fn, reason) => {
      if (me) fn();
      else setModal({ type: "login", reason });
    },

    login: (backPath) => {
      if (realAuth) {
        // 구글 로그인은 백엔드를 거쳐 다녀온다. 끝나면 보던 페이지(신규 사용자는 온보딩)로 돌아온다
        window.location.assign(googleLoginUrl(safeBackPath(backPath) ?? "/"));
        return Promise.resolve(true);
      }
      return loginMock(backPath);
    },
    signup: async (data, backPath) => {
      if (me) {
        go("home");
        toast("이미 로그인되어 있어요.");
        return true;
      }
      let policyChanged = false;
      const saved = await act("가입하지", async () => {
        const signup = async () => {
          if (!data.consents)
            throw new ApiError("rule", "약관을 불러온 뒤 다시 동의해 주세요.");
          try {
            return await submitSignup({
              handle: data.handle,
              nick: data.nick,
              interests: data.interests ?? [],
              consents: data.consents,
            });
          } catch (e) {
            policyChanged = toApiError(e).code === "USER_409_03";
            throw e;
          }
        };
        const r = realAuth
          ? await api.adoptMember(memberToUser(await signup()))
          : await api.signup({
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
      });
      return policyChanged ? "policyChanged" : saved;
    },
    logout: () =>
      act("로그아웃하지", async () => {
        if (realAuth) {
          await submitLogout();
          applySession((await api.adoptMember(null)).session);
          // 내 서비스로 합쳐 둔 비공개 서비스는 비회원 화면에 남지 않게 한다
          setServices((l) => l.filter((s) => s.pub === "public"));
        } else applySession(await api.logout());
        go("home");
        toast("로그아웃했어요.");
      }),
    withdraw: () =>
      act("탈퇴 처리하지", async () => {
        // 실제 로그인에서는 서버가 계정을 지운 뒤에 화면의 서비스·리뷰 목업 상태를 정리한다
        if (realAuth) await submitWithdraw();
        const r = await api.withdraw().catch(async (e) => {
          // 서버 계정은 이미 삭제됐으므로 화면의 로그인 상태도 해제한다
          if (realAuth) {
            applySession((await api.adoptMember(null)).session);
            // 내 서비스로 합쳐 둔 비공개 서비스가 비회원 화면에 남지 않게 한다
            setServices((l) => l.filter((s) => s.pub === "public"));
          }
          throw e;
        });
        setServices(r.services);
        setReviews(r.reviews);
        setComments(r.comments);
        applySession(r.session);
        go("home");
        toast(
          realAuth
            ? "탈퇴 처리했어요."
            : "탈퇴 처리했어요. (데모: 실제 계정은 삭제되지 않아요)",
        );
      }),
    updateMe: async (patch) => {
      let saved: User | undefined;
      await act("계정 설정을 저장하지", async () => {
        let u: User;
        if (realAuth) {
          // 서버에 저장하고, 서버가 정리한 값(링크 주소 등)을 화면에 반영한다
          u = memberToUser(await submitProfile({ ...me!, ...patch }));
          await api.adoptMember(u);
        } else u = await api.updateProfile(patch);
        setUsers((us) => ({ ...us, [u.id]: u }));
        saved = u;
        toast(
          realAuth
            ? "계정 설정을 저장했어요."
            : "계정 설정을 저장했어요. (데모: 이 탭에서만 유지돼요)",
        );
      });
      return saved ?? false;
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
      // 집계는 사용자에게 보이지 않는 요청이라 실패해도 알리지 않는다
      if (!mine) {
        try {
          applyService(await call(() => api.recordClick(s.id)));
        } catch {
          // 실패했을 때 이전 서비스 값을 다시 넣으면 그 사이 바뀐 값을 덮어쓰므로 아무것도 하지 않는다
        }
      }
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
    toggleLike: (id) =>
      act("좋아요를 바꾸지", async () => {
        const r = await api.toggleLike(id);
        applyService(r.service);
        setLikes((l) => flip(l, id, r.on));
        toast(r.on ? "좋아요를 눌렀어요." : "좋아요를 취소했어요.");
      }),
    toggleSave: (id) =>
      act("저장을 바꾸지", async () => {
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
      }),
    report: (key) =>
      act("신고를 접수하지", async () => {
        await api.report(key);
        setReported((r) => new Set([...r, key]));
      }),
    countView: (s) => {
      // 조회수 집계도 사용자에게 보이지 않는 요청이다
      if (!isOwner(s))
        call(() => api.recordView(s.id)).then(applyService, () => {});
    },

    addReview: (s, role, v) =>
      act("리뷰를 남기지", async () => {
        const r = await api.addReview(s.id, role, v);
        setReviews((l) => [r, ...l]);
        setVotes((m) => {
          const n = { ...m };
          delete n[s.id];
          return n;
        });
        if (role === "guest") setGuestReviewed((g) => new Set([...g, s.id]));
        toast("리뷰를 남겼어요.");
      }),
    updateReview: (id, v) =>
      act("리뷰를 수정하지", async () => {
        applyReview(await api.updateReview(id, v));
        toast("리뷰를 수정했어요.");
      }),
    deleteReview: (id) =>
      act("리뷰를 삭제하지", async () => {
        await api.deleteReview(id);
        setReviews((l) => l.filter((r) => r.id !== id));
        toast("리뷰를 삭제했어요.");
      }),
    setReply: (rid, text) =>
      act(text ? "답글을 등록하지" : "답글을 삭제하지", async () => {
        applyReview(await api.setReply(rid, text));
        toast(text ? "답글을 등록했어요." : "답글을 삭제했어요.");
      }),

    addComment: (s, v, parentId) =>
      act(parentId ? "답글을 남기지" : "댓글을 남기지", async () => {
        const c = await api.addComment(s.id, v, parentId);
        setComments((l) => [...l, c]);
        toast(parentId ? "답글을 남겼어요." : "댓글을 남겼어요.");
      }),
    updateComment: (id, v) =>
      act("댓글을 수정하지", async () => {
        const c = await api.updateComment(id, v);
        setComments((l) => l.map((x) => (x.id === c.id ? c : x)));
        toast("댓글을 수정했어요.");
      }),
    deleteComment: (id) =>
      act("댓글을 삭제하지", async () => {
        setComments(await api.deleteComment(id));
        toast("댓글을 삭제했어요.");
      }),

    createService: async (data) => {
      let created: Service | null = null;
      await act("서비스를 등록하지", async () => {
        const s = await api.createService(data);
        setServices((l) => [s, ...l]);
        setTodayCount((c) => c + 1);
        created = s;
      });
      return created;
    },
    updateService: (id, patch) =>
      act("서비스를 수정하지", async () => {
        applyService(await api.updateService(id, patch));
      }),
    deleteService: (id) =>
      act("서비스를 삭제하지", async () => {
        await api.deleteService(id);
        setServices((l) => l.filter((s) => s.id !== id));
        setReviews((l) => l.filter((r) => r.sid !== id));
        setComments((l) => l.filter((c) => c.sid !== id));
        setLikes((l) => new Set([...l].filter((x) => x !== id)));
        setSaves((l) => new Set([...l].filter((x) => x !== id)));
        toast("서비스와 리뷰·댓글을 삭제했어요.");
      }),
    checkServiceUrl: (url, selfId) =>
      call(() => api.checkServiceUrl(url, selfId)),

    aiSearch: (q) => call(() => api.aiSearch(q)),
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
