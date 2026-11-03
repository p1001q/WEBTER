"use client";

import { useState } from "react";
import type { Comment, Service } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
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
  const mine = !!wt.me && !c.deleted && c.a.uid === wt.me.id;
  const u = c.a.uid ? wt.users[c.a.uid] : undefined;
  const showUser = c.a.kind === "member" && !!u;
  const isMaker = c.a.kind === "member" && c.a.uid === s.owner;
  const reported = wt.reported.has("comment:" + c.id);
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
              {mine && (
                <MiniButton
                  onClick={() =>
                    wt.setModal({ type: "comment", sid: s.id, comment: c })
                  }
                >
                  <Icon name="edit" size={13} />
                  수정
                </MiniButton>
              )}
              {mine && (
                <MiniButton
                  onClick={() =>
                    wt.setModal({ type: "delete-comment", cid: c.id })
                  }
                >
                  <Icon name="trash" size={13} />
                  삭제
                </MiniButton>
              )}
              {!mine &&
                (reported ? (
                  <MiniButton disabled>
                    <Icon name="check" size={13} />
                    신고 완료
                  </MiniButton>
                ) : (
                  <MiniButton
                    onClick={() =>
                      wt.requireLogin(
                        () =>
                          wt.setModal({
                            type: "report",
                            target: { type: "comment", key: "comment:" + c.id },
                          }),
                        "신고는 로그인한 회원만 할 수 있어요.",
                      )
                    }
                  >
                    <Icon name="flag" size={13} />
                    신고
                  </MiniButton>
                ))}
            </span>
          </div>
          <p className={text}>{c.text}</p>
        </>
      )}
      {!isReply && !c.deleted && (
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
      {!isReply && (replies?.length || replying) ? (
        <div className="flex flex-col gap-3">
          {replies?.map((r) => (
            <CommentItem key={r.id} c={r} s={s} />
          ))}
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
                  if (ok) setReplying(false);
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
