"use client";

import { useId } from "react";
import type { Comment, Service } from "@/api/types";
import { CommentForm } from "@/components/comment/CommentForm";
import { Modal } from "@/components/ui/Modal";
import { useWt } from "@/providers/context";

export function CommentEditModal({
  s,
  comment,
  onClose,
}: {
  s: Service;
  comment: Comment;
  onClose: () => void;
}) {
  const wt = useWt();
  const hid = useId();
  return (
    <Modal onClose={onClose} labelledBy={hid} width={560}>
      <h3 id={hid}>{comment.parent ? "답글 수정" : "댓글 수정"}</h3>
      <p className="mb-[18px]">{s.name}</p>
      <CommentForm
        s={s}
        initial={comment}
        label="댓글 내용"
        submitLabel="수정 완료"
        minHeight={96}
        onCancel={onClose}
        onSubmit={async (v) => {
          const ok = await wt.updateComment(comment.id, v);
          if (ok) onClose();
          return ok;
        }}
      />
    </Modal>
  );
}
