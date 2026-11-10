import {
  deleteJson,
  getJson,
  patchJson,
  postJson,
  putJson,
} from "../auth/http";
import type {
  Comment,
  CommentInput,
  InteractionPermissions,
  Rate,
  Review,
  ReviewInput,
  ReviewVotes,
  User,
} from "../types";
import { mapService, type BackendService, ymd } from "./serviceApi";

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

type BackendRate = "RECOMMEND" | "NOT_RECOMMEND" | "NONE";
type BackendVote = "UP" | "DOWN";
export type ReviewSort = "RECOMMENDED" | "LATEST";
export type ReactionType = "LIKE" | "SAVE";

interface BackendAuthor {
  kind: "MEMBER" | "GUEST";
  uid: string | null;
  nick: string | null;
  handle: string | null;
  ip: string | null;
  anonymous: boolean;
  withdrawn: boolean;
}

interface BackendEntry extends InteractionPermissions {
  id: string;
  sid: string;
  a: BackendAuthor | null;
  date: string;
  text: string;
  edited: boolean;
}

interface BackendVotes {
  up: number;
  down: number;
  mine: BackendVote | null;
}

interface BackendReview extends BackendEntry {
  rate: BackendRate;
  reply: Review["reply"] | null;
  creatorReview: boolean;
  canVote: boolean;
  votes: BackendVotes;
}

interface BackendComment extends BackendEntry {
  parent: string | null;
  deleted: boolean;
  replyCount: number;
}

const RATE: Record<BackendRate, Rate> = {
  RECOMMEND: "up",
  NOT_RECOMMEND: "down",
  NONE: "none",
};
const CODE: Record<Rate, BackendRate> = {
  up: "RECOMMEND",
  down: "NOT_RECOMMEND",
  none: "NONE",
};
const VOTE: Record<BackendVote, "up" | "down"> = { UP: "up", DOWN: "down" };
const mapVotes = (v: BackendVotes): ReviewVotes => ({
  up: v.up,
  down: v.down,
  mine: v.mine ? VOTE[v.mine] : null,
});

function authorOf(a: BackendAuthor | null): User | undefined {
  if (!a?.uid || a.anonymous || a.withdrawn || a.kind !== "MEMBER") return;
  return {
    id: a.uid,
    nick: a.nick ?? "",
    handle: a.handle ?? "",
    color: "#E3E8F0",
    bio: "",
    links: [],
  };
}

function entryFields(e: BackendEntry) {
  return {
    id: e.id,
    sid: e.sid,
    date: ymd(e.date),
    text: e.text,
    edited: e.edited,
    permissions: {
      mine: e.mine,
      canEdit: e.canEdit,
      canDelete: e.canDelete,
      canReply: e.canReply,
    },
  };
}

export function mapReview(r: BackendReview) {
  const author = authorOf(r.a);
  const kind: Review["a"]["kind"] =
    r.a?.kind === "GUEST"
      ? "guest"
      : r.a?.withdrawn
        ? "left"
        : r.creatorReview
          ? "maker"
          : r.a?.anonymous
            ? "anon"
            : "member";
  const fields = entryFields(r);
  const item: Review = {
    ...fields,
    a: { kind, uid: author?.id, ip: r.a?.ip ?? undefined },
    rate: r.creatorReview ? null : RATE[r.rate],
    reply: r.reply ? { ...r.reply, date: ymd(r.reply.date) } : undefined,
    permissions: { ...fields.permissions, canVote: r.canVote },
    votes: mapVotes(r.votes),
  };
  return { item, author };
}

export function mapComment(c: BackendComment) {
  const author = authorOf(c.a);
  const kind: Comment["a"]["kind"] =
    c.deleted || c.a?.withdrawn ? "left" : c.a?.anonymous ? "anon" : "member";
  const item: Comment = {
    ...entryFields(c),
    a: { kind, uid: author?.id },
    parent: c.parent,
    deleted: c.deleted,
    replyCount: c.replyCount,
  };
  return { item, author };
}

const base = (sid: string) => `/api/services/${encodeURIComponent(sid)}`;
const reviewPath = (sid: string, id: string) =>
  `${base(sid)}/reviews/${encodeURIComponent(id)}`;
const commentPath = (sid: string, id: string) =>
  `${base(sid)}/comments/${encodeURIComponent(id)}`;
const reviewBody = (v: ReviewInput) => ({ ...v, rate: v.rate && CODE[v.rate] });

export const interactionApi = {
  service: async (sid: string) =>
    mapService(await getJson<BackendService>(base(sid))),
  reactions: (sid: string) =>
    getJson<{ liked: boolean; saved: boolean }>(`${base(sid)}/reactions`),
  setReaction: (sid: string, type: ReactionType, on: boolean) => {
    const path = `${base(sid)}/reactions/${type}`;
    return on
      ? putJson<{ on: boolean }>(path)
      : deleteJson<{ on: boolean }>(path);
  },
  record: (sid: string, type: "VIEW" | "LAUNCH") =>
    postJson<null>(`${base(sid)}/events/${type}`),
  async reviews(sid: string, sort: ReviewSort, cursor?: string) {
    const query = new URLSearchParams({ sort });
    if (cursor) query.set("cursor", cursor);
    const page = await getJson<CursorPage<BackendReview>>(
      `${base(sid)}/reviews?${query}`,
    );
    return { items: page.items.map(mapReview), nextCursor: page.nextCursor };
  },
  async myReview(sid: string) {
    const review = await getJson<BackendReview | null>(
      `${base(sid)}/reviews/me`,
    );
    return review ? mapReview(review) : null;
  },
  async addReview(sid: string, v: ReviewInput, guest: boolean) {
    const path = `${base(sid)}/reviews${guest ? "/guest" : ""}`;
    return mapReview(await postJson<BackendReview>(path, reviewBody(v)));
  },
  async updateReview(sid: string, id: string, v: ReviewInput) {
    return mapReview(
      await patchJson<BackendReview>(reviewPath(sid, id), reviewBody(v)),
    );
  },
  deleteReview: (sid: string, id: string) =>
    deleteJson<null>(reviewPath(sid, id)),
  async setRating(sid: string, rate: "up" | "down" | null) {
    const path = `${base(sid)}/rating`;
    if (rate)
      return mapReview(
        await putJson<BackendReview>(path, { rate: CODE[rate] }),
      );
    await deleteJson<null>(path);
    return null;
  },
  async setVote(sid: string, id: string, vote: "up" | "down" | null) {
    const path = `${reviewPath(sid, id)}/vote`;
    return mapVotes(
      vote
        ? await putJson<BackendVotes>(path, {
            vote: vote === "up" ? "UP" : "DOWN",
          })
        : await deleteJson<BackendVotes>(path),
    );
  },
  async setReply(sid: string, id: string, text: string | null) {
    const path = `${reviewPath(sid, id)}/reply`;
    return mapReview(
      text === null
        ? await deleteJson<BackendReview>(path)
        : await putJson<BackendReview>(path, { text }),
    );
  },
  async comments(sid: string, parentId?: string, cursor?: string) {
    const query = new URLSearchParams();
    if (parentId) query.set("parentId", parentId);
    if (cursor) query.set("cursor", cursor);
    const page = await getJson<CursorPage<BackendComment>>(
      `${base(sid)}/comments?${query}`,
    );
    return { items: page.items.map(mapComment), nextCursor: page.nextCursor };
  },
  async addComment(sid: string, v: CommentInput, parentId?: string) {
    return mapComment(
      await postJson<BackendComment>(`${base(sid)}/comments`, {
        ...v,
        parentId,
      }),
    );
  },
  async updateComment(sid: string, id: string, v: CommentInput) {
    return mapComment(await patchJson<BackendComment>(commentPath(sid, id), v));
  },
  deleteComment: (sid: string, id: string) =>
    deleteJson<null>(commentPath(sid, id)),
};
