"use client";

import { useCallback, useState } from "react";
import { realAuth } from "@/api/auth/config";
import { CursorListControls } from "@/components/ui/CursorListControls";
import { useCursorList } from "@/lib/useCursorList";
import type { Comment, Service } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { ReportButton } from "@/components/modals/ReportButton";
import { Icon } from "@/components/ui/Icon";
import { MakerBadge } from "@/components/ui/MakerBadge";
import { MiniButton } from "@/components/ui/MiniButton";
import { RouteLink } from "@/components/ui/RouteLink";
import { commentAuthorName } from "@/domain/comment";
import { fmtDate } from "@/domain/format";
import { cx } from "@/lib/cx";
import { useRevealWhenFresh } from "@/lib/revealFresh";
import { useWt } from "@/providers/context";
import { CommentForm } from "./CommentForm";

const text =
  "m-0 text-15 leading-[1.7] whitespace-pre-line text-[#3a3a3a] [overflow-wrap:anywhere]";

/** 댓글 한 건과 그 답글들. 답글은 한 단계까지, 등록순이다 */
export function CommentItem({
  c,
  s,
  replies,
}: {
  c: Comment;
  s: Service;
  /** 이 댓글에 달린 답글(답글 자신에게는 없다) */
  replies?: Comment[];
}) {
  const wt = useWt();
  const revealRef = useRevealWhenFresh(c.id, c.fresh);
  const [replying, setReplying] = useState(false);
  const isReply = !!c.parent;
  const mine =
    c.permissions?.mine ?? (!!wt.me && !c.deleted && c.a.uid === wt.me.id);
  const canEdit = c.permissions?.canEdit ?? mine;
  const canDelete = c.permissions?.canDelete ?? mine;
  const canReply =
    !isReply && !c.deleted && (!wt.me || (c.permissions?.canReply ?? true));
  const [showReplies, setShowReplies] = useState(false);
  const loadComments = wt.loadComments;
  const load = useCallback(
    (cursor?: string) => loadComments(s.id, c.id, cursor),
    [c.id, loadComments, s.id],
  );
  const page = useCursorList(
    `${s.id}:${c.id}:${wt.me?.id ?? "guest"}`,
    wt.commentRevision(s.id),
    realAuth &&
      wt.sessionReady &&
      !isReply &&
      showReplies &&
      (c.replyCount ?? 0) > 0,
    load,
  );
  const byId = new Map(
    wt.comments
      .filter((comment) => comment.parent === c.id)
      .map((comment) => [comment.id, comment]),
  );
  const loadedReplies = realAuth
    ? page.ids.flatMap((id) => byId.get(id) ?? [])
    : (replies ?? []);
  const u = c.a.uid ? wt.users[c.a.uid] : undefined;
  const showUser = c.a.kind === "member" && !!u;
  const isMaker = c.a.kind === "member" && c.a.uid === s.owner;
  return (
    <div
      ref={revealRef}
      id={"comment-" + c.id}
      className={cx(
        "flex flex-col gap-2",
        isReply
          ? "ml-8 border-l-2 border-light pl-4 @max-[560px]/app:ml-3"
          : "border-b border-border py-5",
        c.fresh && "animate-fresh",
      )}
      data-comment={isReply ? "reply" : "comment"}
    >
      {c.deleted ? (
        <p className="m-0 text-14 text-muted">삭제된 댓글입니다.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5 text-14">
            {showUser ? (
              <RouteLink
                to="profile"
                params={{ id: u!.id }}
                className="inline-flex items-center gap-2"
              >
                <Avatar user={u} size={isReply ? 26 : 30} />
                <span className="font-bold">{u!.nick}</span>
              </RouteLink>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Avatar user={null} size={isReply ? 26 : 30} />
                <span
                  className={cx(
                    "font-bold",
                    c.a.kind === "left" && "text-muted",
                  )}
                >
                  {commentAuthorName(c.a, wt.users)}
                </span>
              </span>
            )}
            {isMaker && <MakerBadge />}
            <span className="text-12 text-muted">
              {fmtDate(c.date)}
              {c.edited && " (수정됨)"}
            </span>
            <span className="ml-auto flex gap-0.5">
              {canEdit && (
                <MiniButton
                  onClick={() =>
                    wt.setModal({ type: "comment", sid: s.id, comment: c })
                  }
                >
                  <Icon name="edit" size={13} />
                  수정
                </MiniButton>
              )}
              {canDelete && (
                <MiniButton
                  onClick={() =>
                    wt.setModal({ type: "delete-comment", cid: c.id })
                  }
                >
                  <Icon name="trash" size={13} />
                  삭제
                </MiniButton>
              )}
              <ReportButton
                target={{ targetType: "COMMENT", targetId: c.id }}
              />
            </span>
          </div>
          <p className={text}>{c.text}</p>
        </>
      )}
      {canReply && (
        <MiniButton
          className="self-start"
          aria-expanded={replying}
          onClick={() =>
            wt.requireLogin(
              () => setReplying((v) => !v),
              "답글을 남기려면 로그인이 필요해요.",
            )
          }
        >
          <Icon name="reply" size={13} />
          답글
        </MiniButton>
      )}
      {realAuth && !isReply && !!c.replyCount && (
        <MiniButton
          className="self-start"
          aria-expanded={showReplies}
          onClick={() => setShowReplies((open) => !open)}
        >
          {showReplies ? "답글 접기" : `답글 ${c.replyCount}개 보기`}
        </MiniButton>
      )}
      {!isReply && (loadedReplies.length || replying || showReplies) ? (
        <div className="flex flex-col gap-3">
          {loadedReplies.map((r) => (
            <CommentItem key={r.id} c={r} s={s} />
          ))}
          {realAuth && showReplies && page.loading && !loadedReplies.length && (
            <p className="text-14 text-muted" role="status">
              답글을 불러오고 있어요.
            </p>
          )}
          {realAuth && showReplies && (
            <CursorListControls
              label="답글 더 보기"
              error={page.error}
              hasMore={page.hasMore}
              pending={page.loading || page.morePending}
              loadMore={page.loadMore}
              retry={page.retry}
            />
          )}
          {replying && (
            <div className="ml-8 @max-[560px]/app:ml-3">
              <CommentForm
                s={s}
                label="답글 내용"
                placeholder="답글을 남겨 주세요."
                submitLabel="답글 남기기"
                minHeight={64}
                onCancel={() => setReplying(false)}
                onSubmit={async (v) => {
                  const ok = await wt.addComment(s, v, c.id);
                  if (ok) {
                    setReplying(false);
                    setShowReplies(realAuth);
                  }
                  return ok;
                }}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
