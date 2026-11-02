"use client";

import type { Comment, Service } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { boxClass } from "@/components/ui/box";
import { helpClass, labelClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/Icon";
import { useWt } from "@/providers/context";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";

/** 서비스 상세의 댓글 탭: 작성 폼(회원만)과 댓글·답글 목록 */
export function CommentSection({ s }: { s: Service }) {
  const wt = useWt();
  const all = wt.comments.filter((c) => c.sid === s.id);
  const tops = all.filter((c) => !c.parent);
  const repliesOf = new Map<string, Comment[]>();
  for (const c of all)
    if (c.parent)
      repliesOf.set(c.parent, [...(repliesOf.get(c.parent) ?? []), c]);
  const total = all.filter((c) => !c.deleted).length;
  return (
    <div data-component="comment-section">
      <p className={`${helpClass} pt-5`}>
        리뷰와 별개로 서비스에 대한 이야기를 나누는 곳이에요. 평가에는 영향을
        주지 않아요.
      </p>
      {wt.me ? (
        <div
          className={`${boxClass} my-5 flex flex-col gap-3 p-6`}
          data-component="comment-form"
        >
          <div className={labelClass}>댓글 남기기</div>
          <CommentForm
            s={s}
            label="댓글 내용"
            onSubmit={(v) => wt.addComment(s, v)}
          />
        </div>
      ) : (
        <div
          className={`${boxClass} my-5 flex flex-wrap items-center gap-3 px-6 py-4`}
          data-component="comment-gate"
        >
          <Icon name="lock" size={18} />
          <p className="m-0 min-w-[200px] flex-1 text-14 text-text-2">
            댓글은 회원만 남길 수 있어요. 로그인하고 이야기에 참여해 보세요.
          </p>
          <Button
            size="sm"
            onClick={() =>
              wt.requireLogin(() => {}, "댓글을 남기려면 로그인이 필요해요.")
            }
          >
            로그인하고 댓글 쓰기
          </Button>
        </div>
      )}
      <div className={`${helpClass} py-2`}>댓글 {total}개</div>
      {tops.length ? (
        tops.map((c) => (
          <CommentItem key={c.id} c={c} s={s} replies={repliesOf.get(c.id)} />
        ))
      ) : (
        <p className="m-0 py-10 text-center text-14 text-muted">
          아직 댓글이 없어요. 첫 댓글을 남겨 보세요.
        </p>
      )}
    </div>
  );
}
