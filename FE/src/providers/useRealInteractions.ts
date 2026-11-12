"use client";

/* eslint-disable react-hooks/preserve-manual-memoization --
 * 이 훅의 콜백은 요청 시작 때의 viewerEpoch.current 를 읽어 로그인 상태가 바뀐 뒤 늦게 온 응답을 버린다.
 * ref 값은 호출 시점에 읽어야 하므로 의존성에 넣지 않으며, 자동 최적화(React Compiler)가 이 훅을 건너뛰어도 동작은 같다. */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from "react";
import { realAuth } from "@/api/auth/config";
import { ApiError, failureText, toApiError } from "@/api/errors";
import {
  interactionApi,
  type ReactionType,
  type ReviewSort,
} from "@/api/real/interactionApi";
import { profileApi } from "@/api/real/profileApi";
import type { Comment, Review, Service, User } from "@/api/types";
import { gradeOf } from "@/domain/review";
import type { WtStore } from "./types";

type Setter<T> = Dispatch<SetStateAction<T>>;

interface Props {
  viewerEpoch: RefObject<number>;
  me: User | null;
  meId: string | null;
  reviews: Review[];
  comments: Comment[];
  setServices: Setter<Service[]>;
  setReviews: Setter<Review[]>;
  setComments: Setter<Comment[]>;
  setLikes: Setter<Set<string>>;
  setSaves: Setter<Set<string>>;
  setGuestReviewed: Setter<Set<string>>;
  setUsers: Setter<Record<string, User>>;
  setOffline: Setter<boolean>;
  call: <T>(run: () => Promise<T>) => Promise<T>;
  act: (what: string, run: () => Promise<void>) => Promise<boolean>;
  toast: WtStore["toast"];
  go: WtStore["go"];
}

type ReactionState = Awaited<ReturnType<typeof interactionApi.reactions>>;
type Authored<T> = { item: T; author?: User };

function mergeEntries<T extends { id: string }>(previous: T[], incoming: T[]) {
  const byId = new Map(previous.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

function updateSet(set: Set<string>, id: string, on: boolean) {
  if (set.has(id) === on) return set;
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

export function useRealInteractions({
  viewerEpoch,
  me,
  meId,
  reviews,
  comments,
  setServices,
  setReviews,
  setComments,
  setLikes,
  setSaves,
  setGuestReviewed,
  setUsers,
  setOffline,
  call,
  act,
  toast,
  go,
}: Props) {
  const [myReviews, setMyReviews] = useState<Record<string, Review | null>>({});
  const [reviewRevisions, setReviewRevisions] = useState<
    Record<string, number>
  >({});
  const [commentRevisions, setCommentRevisions] = useState<
    Record<string, number>
  >({});
  const reviewVersions = useRef(new Map<string, number>());
  const commentVersions = useRef(new Map<string, number>());
  const serviceRefreshes = useRef(new Map<string, number>());
  const reactionStates = useRef(new Map<string, Promise<ReactionState>>());
  const interactionLocks = useRef(new Set<string>());
  const reset = useCallback(() => {
    reactionStates.current.clear();
    setReviews([]);
    setComments([]);
    setMyReviews({});
  }, [setReviews, setComments]);

  const rememberAuthors = useCallback(
    (entries: Authored<unknown>[]) => {
      setUsers((previous) => {
        const missing = entries.flatMap(({ author }) =>
          author && !previous[author.id] ? [author] : [],
        );
        if (!missing.length) return previous;
        return {
          ...previous,
          ...Object.fromEntries(missing.map((author) => [author.id, author])),
        };
      });
    },
    [setUsers],
  );

  const loadReviews = useCallback(
    async (sid: string, sort: ReviewSort, cursor?: string) => {
      const epoch = viewerEpoch.current;
      const version = reviewVersions.current.get(sid);
      const [page, mine] = await call(() =>
        Promise.all([
          interactionApi.reviews(sid, sort, cursor),
          !cursor && meId
            ? interactionApi.myReview(sid)
            : Promise.resolve(undefined),
        ]),
      );
      if (
        epoch === viewerEpoch.current &&
        version === reviewVersions.current.get(sid)
      ) {
        rememberAuthors(page.items);
        setReviews((old) =>
          mergeEntries(
            old,
            page.items.map(({ item }) => item),
          ),
        );
        if (mine !== undefined)
          setMyReviews((old) => ({ ...old, [sid]: mine?.item ?? null }));
      }
      return {
        items: page.items.map(({ item }) => item.id),
        nextCursor: page.nextCursor,
      };
    },
    [call, meId, rememberAuthors, setReviews, viewerEpoch],
  );

  const loadComments = useCallback(
    async (sid: string, parentId?: string, cursor?: string) => {
      const epoch = viewerEpoch.current;
      const version = commentVersions.current.get(sid);
      const page = await call(() =>
        interactionApi.comments(sid, parentId, cursor),
      );
      if (
        epoch === viewerEpoch.current &&
        version === commentVersions.current.get(sid)
      ) {
        rememberAuthors(page.items);
        setComments((old) =>
          mergeEntries(
            old,
            page.items.map(({ item }) => item),
          ),
        );
      }
      return {
        items: page.items.map(({ item }) => item.id),
        nextCursor: page.nextCursor,
      };
    },
    [call, rememberAuthors, setComments, viewerEpoch],
  );

  const readReaction = useCallback(
    (sid: string) => {
      const cached = reactionStates.current.get(sid);
      if (cached) return cached;
      const epoch = viewerEpoch.current;
      const request = interactionApi.reactions(sid).then(
        (state) => {
          if (epoch === viewerEpoch.current) {
            setLikes((old) => updateSet(old, sid, state.liked));
            setSaves((old) => updateSet(old, sid, state.saved));
          }
          return state;
        },
        (error: unknown) => {
          if (reactionStates.current.get(sid) === request)
            reactionStates.current.delete(sid);
          throw error;
        },
      );
      reactionStates.current.set(sid, request);
      return request;
    },
    [setLikes, setSaves, viewerEpoch],
  );

  // 로그인하면 내 좋아요·저장 상태를 한 번에 채운다(서비스마다 조회하지 않는다). 저장은 저장한 순서를 유지한다.
  const refreshMyReactions = useCallback(async () => {
    const epoch = viewerEpoch.current;
    const [liked, saved] = await Promise.all([
      profileApi.liked(),
      profileApi.saved(),
    ]);
    if (epoch !== viewerEpoch.current) return;
    setLikes(new Set(liked));
    setSaves(new Set(saved.map((s) => s.serviceId)));
  }, [setLikes, setSaves, viewerEpoch]);
  useEffect(() => {
    if (!realAuth || !meId) return;
    let active = true;
    refreshMyReactions().catch((error: unknown) => {
      if (!active) return;
      const err = toApiError(error);
      if (err.kind === "network") setOffline(true);
      else toast(failureText("내 반응을 불러오지", err), { err: true });
    });
    return () => {
      active = false;
    };
  }, [meId, refreshMyReactions, setOffline, toast]);

  // 마이페이지: 서비스를 가리지 않고 내가 쓴 리뷰·댓글과 저장 순서를 모은다
  const loadMypage = useCallback(async () => {
    if (!realAuth || !meId) return;
    const epoch = viewerEpoch.current;
    const [mineReviews, mineComments] = await call(async () => {
      const [r, c] = await Promise.all([
        profileApi.myReviews(),
        profileApi.myComments(),
        refreshMyReactions(),
      ]);
      return [r, c] as const;
    });
    if (epoch !== viewerEpoch.current) return;
    rememberAuthors([...mineReviews, ...mineComments]);
    setReviews((old) =>
      mergeEntries(
        old,
        mineReviews.map(({ item }) => item),
      ),
    );
    setComments((old) =>
      mergeEntries(
        old,
        mineComments.map(({ item }) => item),
      ),
    );
  }, [
    call,
    meId,
    refreshMyReactions,
    rememberAuthors,
    setComments,
    setReviews,
    viewerEpoch,
  ]);

  // 제작자 프로필: 서버가 가진 소개·외부 링크를 사용자 정보에 합친다
  const loadProfile = useCallback(
    async (id: string) => {
      if (!realAuth) return;
      const epoch = viewerEpoch.current;
      const user = await call(() => profileApi.profile(id));
      if (viewerEpoch.current !== epoch) return;
      setUsers((previous) => ({
        ...previous,
        [user.id]:
          user.id === meId && previous[user.id]
            ? { ...previous[user.id], profileModerated: user.profileModerated }
            : { ...previous[user.id], ...user },
      }));
    },
    [call, meId, setUsers, viewerEpoch],
  );

  const interact = async (
    key: string,
    what: string,
    run: (current: () => boolean) => Promise<void>,
  ) => {
    const epoch = viewerEpoch.current;
    const lock = `${epoch}:${key}`;
    if (interactionLocks.current.has(lock)) return false;
    interactionLocks.current.add(lock);
    try {
      return await act(what, () => run(() => viewerEpoch.current === epoch));
    } finally {
      interactionLocks.current.delete(lock);
    }
  };

  const refreshCounts = (sid: string) => {
    const version = (serviceRefreshes.current.get(sid) ?? 0) + 1;
    serviceRefreshes.current.set(sid, version);
    void act("서비스 집계를 불러오지", async () => {
      const { views, clicks, likes, saves, rv, sc } =
        await interactionApi.service(sid);
      if (serviceRefreshes.current.get(sid) !== version) return;
      setServices((all) =>
        all.map((s) =>
          s.id === sid ? { ...s, views, clicks, likes, saves, rv, sc } : s,
        ),
      );
    });
  };

  const refreshReviews = (sid: string) => {
    const version = (reviewVersions.current.get(sid) ?? 0) + 1;
    reviewVersions.current.set(sid, version);
    setReviewRevisions((old) => ({ ...old, [sid]: version }));
  };

  const refreshComments = (sid: string) => {
    const version = (commentVersions.current.get(sid) ?? 0) + 1;
    commentVersions.current.set(sid, version);
    setCommentRevisions((old) => ({ ...old, [sid]: version }));
  };

  const rememberReview = (entry: Authored<Review>) => {
    rememberAuthors([entry]);
    setReviews((old) => mergeEntries(old, [entry.item]));
    if (entry.item.permissions?.mine)
      setMyReviews((old) => ({ ...old, [entry.item.sid]: entry.item }));
  };

  const rememberComment = (entry: Authored<Comment>) => {
    rememberAuthors([entry]);
    setComments((old) => mergeEntries(old, [entry.item]));
  };

  const findReview = (id: string) =>
    reviews.find((r) => r.id === id) ??
    Object.values(myReviews).find((r) => r?.id === id);
  const findComment = (id: string) => comments.find((c) => c.id === id);

  const toggleReaction = (
    sid: string,
    type: ReactionType,
    what: string,
    done: (on: boolean) => void,
  ) =>
    interact(`reaction:${sid}`, what, async (current) => {
      const old = await readReaction(sid);
      if (!current()) return;
      const { on } = await interactionApi.setReaction(
        sid,
        type,
        !(type === "LIKE" ? old.liked : old.saved),
      );
      if (!current()) return;
      const next =
        type === "LIKE" ? { ...old, liked: on } : { ...old, saved: on };
      reactionStates.current.set(sid, Promise.resolve(next));
      setLikes((all) => updateSet(all, sid, next.liked));
      setSaves((all) => updateSet(all, sid, next.saved));
      done(on);
      refreshCounts(sid);
    });

  const record = (sid: string, type: "VIEW" | "LAUNCH") => {
    if (!me) return;
    void act(
      type === "VIEW" ? "조회 기록을 남기지" : "이용 기록을 남기지",
      async () => {
        await interactionApi.record(sid, type);
        refreshCounts(sid);
      },
    );
  };

  const actions: Pick<
    WtStore,
    | "toggleLike"
    | "toggleSave"
    | "addReview"
    | "updateReview"
    | "deleteReview"
    | "setReply"
    | "addComment"
    | "updateComment"
    | "deleteComment"
    | "voteOnReview"
    | "agg"
    | "myVote"
    | "myReview"
    | "myReviewReady"
    | "reviewRevision"
    | "commentRevision"
    | "loadReviews"
    | "loadComments"
    | "loadMypage"
    | "loadProfile"
    | "setVote"
    | "launch"
    | "countView"
  > = {
    toggleLike: (id) =>
      toggleReaction(id, "LIKE", "좋아요를 바꾸지", (on) =>
        toast(on ? "좋아요를 눌렀어요." : "좋아요를 취소했어요."),
      ),
    toggleSave: (id) =>
      toggleReaction(id, "SAVE", "저장을 바꾸지", (on) =>
        toast(
          on
            ? "저장했어요. 마이페이지에서 다시 볼 수 있어요."
            : "저장을 취소했어요.",
          on
            ? {
                action: "보기",
                onAction: () => go("mypage", { tab: "saved" }),
              }
            : {},
        ),
      ),
    addReview: (s, role, v) =>
      interact(`my-review:${s.id}`, "리뷰를 남기지", async (current) => {
        const guest = role === "guest";
        const markGuestReviewed = () =>
          setGuestReviewed((old) => updateSet(old, s.id, true));
        try {
          const entry = await interactionApi.addReview(s.id, v, guest);
          if (!current()) return;
          if (guest) markGuestReviewed();
          rememberReview(entry);
          refreshReviews(s.id);
          refreshCounts(s.id);
          toast("리뷰를 남겼어요.");
        } catch (error) {
          if (
            guest &&
            current() &&
            toApiError(error).code === "INTERACTION_409_05"
          )
            markGuestReviewed();
          throw error;
        }
      }),
    updateReview: (id, v) =>
      interact(
        `my-review:${findReview(id)?.sid}`,
        "리뷰를 수정하지",
        async (current) => {
          const r = findReview(id);
          if (!r) throw new ApiError("notFound");
          const entry = await interactionApi.updateReview(r.sid, id, v);
          if (!current()) return;
          rememberReview(entry);
          refreshReviews(r.sid);
          refreshCounts(r.sid);
          toast("리뷰를 수정했어요.");
        },
      ),
    deleteReview: (id) =>
      interact(
        `my-review:${findReview(id)?.sid}`,
        "리뷰를 삭제하지",
        async (current) => {
          const r = findReview(id);
          if (!r) throw new ApiError("notFound");
          await interactionApi.deleteReview(r.sid, id);
          if (!current()) return;
          setReviews((all) => all.filter((x) => x.id !== id));
          setMyReviews((old) => ({ ...old, [r.sid]: null }));
          refreshReviews(r.sid);
          refreshCounts(r.sid);
          toast("리뷰를 삭제했어요.");
        },
      ),
    setReply: (rid, text) =>
      interact(
        `reply:${rid}`,
        text ? "답글을 저장하지" : "답글을 삭제하지",
        async (current) => {
          const r = findReview(rid);
          if (!r) throw new ApiError("notFound");
          const entry = await interactionApi.setReply(r.sid, rid, text);
          if (!current()) return;
          rememberReview(entry);
          refreshReviews(r.sid);
          toast(text ? "답글을 저장했어요." : "답글을 삭제했어요.");
        },
      ),
    addComment: (s, v, parentId) =>
      interact(
        `comment:${s.id}`,
        parentId ? "답글을 남기지" : "댓글을 남기지",
        async (current) => {
          const entry = await interactionApi.addComment(s.id, v, parentId);
          if (!current()) return;
          rememberComment(entry);
          refreshComments(s.id);
          toast(parentId ? "답글을 남겼어요." : "댓글을 남겼어요.");
        },
      ),
    updateComment: (id, v) =>
      interact(
        `comment:${findComment(id)?.sid}`,
        "댓글을 수정하지",
        async (current) => {
          const c = findComment(id);
          if (!c) throw new ApiError("notFound");
          const entry = await interactionApi.updateComment(c.sid, id, v);
          if (!current()) return;
          rememberComment(entry);
          refreshComments(c.sid);
          toast("댓글을 수정했어요.");
        },
      ),
    deleteComment: (id) =>
      interact(
        `comment:${findComment(id)?.sid}`,
        "댓글을 삭제하지",
        async (current) => {
          const c = findComment(id);
          if (!c) throw new ApiError("notFound");
          await interactionApi.deleteComment(c.sid, id);
          if (!current()) return;
          setComments((all) => all.filter((x) => x.id !== id));
          refreshComments(c.sid);
          toast("댓글을 삭제했어요.");
        },
      ),
    voteOnReview: (review, vote) =>
      interact(`vote:${review.id}`, "리뷰 투표를 바꾸지", async (current) => {
        const next = await interactionApi.setVote(
          review.sid,
          review.id,
          review.votes?.mine === vote ? null : vote,
        );
        if (!current()) return;
        setReviews((all) =>
          all.map((r) => (r.id === review.id ? { ...r, votes: next } : r)),
        );
        refreshReviews(review.sid);
      }),
    agg: (s) => {
      const { up, down, none } = s.rv;
      return {
        up,
        down,
        none,
        total: up + down + none,
        visible: reviews.filter((r) => r.sid === s.id).length,
        ...gradeOf(up, down),
      };
    },
    myVote: (sid) => {
      const rate = myReviews[sid]?.rate;
      return rate === "up" || rate === "down" ? rate : null;
    },
    myReview: (sid) => {
      const mine = myReviews[sid];
      return mine?.text ? mine : undefined;
    },
    myReviewReady: (sid) => !realAuth || !me || myReviews[sid] !== undefined,
    reviewRevision: (sid) => reviewRevisions[sid] ?? 0,
    commentRevision: (sid) => commentRevisions[sid] ?? 0,
    loadReviews,
    loadComments,
    loadMypage,
    loadProfile,
    setVote: (sid, next) => {
      if (myReviews[sid]?.text) return;
      void interact(`my-review:${sid}`, "평가를 바꾸지", async (current) => {
        const entry = await interactionApi.setRating(sid, next);
        if (!current()) return;
        setMyReviews((old) => ({ ...old, [sid]: entry?.item ?? null }));
        refreshReviews(sid);
        refreshCounts(sid);
      });
    },
    launch: async (s) => {
      if (s.use !== "live") return;
      window.open(s.url, "_blank", "noopener,noreferrer");
      record(s.id, "LAUNCH");
    },
    countView: (s) => record(s.id, "VIEW"),
  };

  return { actions, reset };
}
