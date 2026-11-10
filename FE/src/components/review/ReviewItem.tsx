"use client";

import { useId, useState } from "react";
import type { Review, Service } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { textareaClass } from "@/components/ui/field";
import { FieldMessage } from "@/components/ui/FieldMessage";
import { Icon } from "@/components/ui/Icon";
import { MakerBadge } from "@/components/ui/MakerBadge";
import { MiniButton } from "@/components/ui/MiniButton";
import { RouteLink } from "@/components/ui/RouteLink";
import { fmtDate } from "@/domain/format";
import { authorName, hasLink } from "@/domain/review";
import { cx } from "@/lib/cx";
import { isMaker } from "@/domain/maker";
import { useRevealWhenFresh } from "@/lib/revealFresh";
import { useWt } from "@/providers/context";

const RATE = {
  up: ["추천", "thumbUp", "bg-navy-50 text-navy"],
  down: ["비추천", "thumbDown", "bg-wine-50 text-wine"],
  none: ["미설정", "minus", "bg-light text-muted"],
} as const;
const text =
  "m-0 text-15 leading-[1.7] whitespace-pre-line text-[#3a3a3a] [overflow-wrap:anywhere]";

/** 리뷰 한 건: 작성자·평가·수정/삭제/신고·제작자 답글 */
export function ReviewItem({ r, s }: { r: Review; s: Service }) {
  const wt = useWt();
  const revealRef = useRevealWhenFresh(r.id, r.fresh);
  const isOwner = isMaker(s, wt.me?.id);
  const mine = r.permissions?.mine ?? (!!wt.me && r.a.uid === wt.me.id);
  const canEdit = r.permissions?.canEdit ?? mine;
  const canDelete = r.permissions?.canDelete ?? mine;
  const canReply = r.permissions?.canReply ?? (isOwner && r.a.kind !== "maker");
  const [voting, setVoting] = useState(false);
  const [replyBusy, setReplyBusy] = useState(false);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const u = r.a.uid ? wt.users[r.a.uid] : undefined;
  const showUser = (r.a.kind === "member" || r.a.kind === "maker") && !!u;
  const reported = wt.reported.has("review:" + r.id);
  const rate =
    RATE[r.rate === "up" ? "up" : r.rate === "down" ? "down" : "none"];
  const replyLink = hasLink(reply);
  const P = useId();
  const reportBtn = (key: string, type: "review" | "reply", done: boolean) =>
    done ? (
      <MiniButton disabled>
        <Icon name="check" size={13} />
        신고 완료
      </MiniButton>
    ) : (
      <MiniButton
        onClick={() =>
          wt.requireLogin(
            () => wt.setModal({ type: "report", target: { type, key } }),
            "신고는 로그인한 회원만 할 수 있어요.",
          )
        }
      >
        <Icon name="flag" size={13} />
        신고
      </MiniButton>
    );
  const who = "font-bold";
  return (
    <div
      ref={revealRef}
      className={cx(
        "flex flex-col gap-2.5 border-b border-border py-5",
        r.fresh && "animate-fresh",
      )}
      data-author={r.a.kind}
    >
      <div className="flex flex-wrap items-center gap-2.5 text-14">
        {showUser ? (
          <RouteLink
            to="profile"
            params={{ id: u!.id }}
            className="inline-flex items-center gap-2"
          >
            <Avatar user={u} size={30} />
            <span className={who}>{u!.nick}</span>
          </RouteLink>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Avatar user={null} size={30} />
            <span className={cx(who, r.a.kind === "left" && "text-muted")}>
              {authorName(r.a, wt.users)}
            </span>
          </span>
        )}
        {r.a.kind === "maker" ? (
          <MakerBadge />
        ) : (
          <span
            className={`inline-flex h-[22px] items-center gap-1 rounded-sm px-2 text-12 font-bold ${rate[2]}`}
          >
            <Icon name={rate[1]} size={13} stroke={2} />
            {rate[0]}
          </span>
        )}
        <span className="text-12 text-muted">
          {fmtDate(r.date)}
          {r.edited && " (수정됨)"}
        </span>
        <span className="ml-auto flex gap-0.5">
          {canEdit && (
            <MiniButton
              onClick={() =>
                wt.setModal({ type: "review", sid: s.id, review: r })
              }
            >
              <Icon name="edit" size={13} />
              수정
            </MiniButton>
          )}
          {canDelete && (
            <MiniButton
              onClick={() => wt.setModal({ type: "delete-review", rid: r.id })}
            >
              <Icon name="trash" size={13} />
              삭제
            </MiniButton>
          )}
          {!mine && reportBtn("review:" + r.id, "review", reported)}
        </span>
      </div>
      <p className={text}>{r.text}</p>
      {r.votes && (
        <div
          className="flex gap-2"
          role="group"
          aria-label="리뷰 글 추천과 비추천"
        >
          {(["up", "down"] as const).map((vote) => (
            <MiniButton
              key={vote}
              disabled={voting || (!!wt.me && !r.permissions?.canVote)}
              aria-pressed={r.votes?.mine === vote}
              aria-label={vote === "up" ? "리뷰 글 추천" : "리뷰 글 비추천"}
              className={cx(r.votes?.mine === vote && "bg-navy-50 text-navy")}
              onClick={() =>
                wt.requireLogin(async () => {
                  setVoting(true);
                  try {
                    await wt.voteOnReview(r, vote);
                  } finally {
                    setVoting(false);
                  }
                }, "리뷰 글에 투표하려면 로그인이 필요해요.")
              }
            >
              <Icon name={vote === "up" ? "thumbUp" : "thumbDown"} size={14} />
              {r.votes?.[vote]}
            </MiniButton>
          ))}
        </div>
      )}
      {r.reply && (
        <div className="ml-8 flex flex-col gap-1.5 rounded-md border border-border bg-card px-4 py-3.5 @max-[560px]/app:ml-4">
          <div className="flex flex-wrap items-center gap-2 text-13">
            <Icon name="reply" size={14} />
            <b>{wt.users[s.owner]?.nick}</b>
            <MakerBadge />
            <span className="text-12 text-muted">
              {fmtDate(r.reply.date)}
              {r.reply.edited && " (수정됨)"}
            </span>
            <span className="ml-auto flex gap-0.5">
              {canReply && (
                <>
                  {r.permissions && (
                    <MiniButton
                      onClick={() => {
                        setReply(r.reply!.text);
                        setReplying(true);
                      }}
                    >
                      <Icon name="edit" size={13} />
                      답글 수정
                    </MiniButton>
                  )}
                  <MiniButton
                    disabled={replyBusy}
                    onClick={async () => {
                      setReplyBusy(true);
                      try {
                        if (await wt.setReply(r.id, null)) setReplying(false);
                      } finally {
                        setReplyBusy(false);
                      }
                    }}
                  >
                    <Icon name="trash" size={13} />
                    답글 삭제
                  </MiniButton>
                </>
              )}
              {!canReply &&
                reportBtn(
                  "reply:" + r.id,
                  "reply",
                  wt.reported.has("reply:" + r.id),
                )}
            </span>
          </div>
          <p className={`${text} text-14!`}>{r.reply.text}</p>
        </div>
      )}
      {canReply &&
        (!r.reply || replying) &&
        (replying ? (
          <div className="ml-8 flex flex-col gap-1.5 rounded-md border border-border bg-card px-4 py-3.5 @max-[560px]/app:ml-4">
            <label className="sr-only" htmlFor={P + "rp"}>
              답글
            </label>
            <textarea
              id={P + "rp"}
              className={cx(textareaClass, replyLink && "border-wine!")}
              style={{ minHeight: 72 }}
              maxLength={500}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="제작자로서 답글을 남겨 주세요."
            />
            {replyLink && (
              <FieldMessage state="err">
                답글에도 링크를 넣을 수 없어요.
              </FieldMessage>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplying(false)}
              >
                취소
              </Button>
              <Button
                size="sm"
                disabled={reply.trim().length < 2 || replyLink || replyBusy}
                onClick={async () => {
                  setReplyBusy(true);
                  try {
                    if (await wt.setReply(r.id, reply.trim()))
                      setReplying(false);
                  } finally {
                    setReplyBusy(false);
                  }
                }}
              >
                {r.reply ? "답글 저장" : "답글 등록"}
              </Button>
            </div>
          </div>
        ) : (
          <MiniButton
            className="self-start"
            onClick={() => {
              setReply("");
              setReplying(true);
            }}
          >
            <Icon name="reply" size={13} />
            답글 달기
          </MiniButton>
        ))}
    </div>
  );
}
