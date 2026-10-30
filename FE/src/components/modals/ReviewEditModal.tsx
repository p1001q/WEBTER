"use client";

import { useId } from "react";
import type { Review, Service } from "@/api/types";
import { ReviewForm } from "@/components/review/ReviewForm";
import { Modal } from "@/components/ui/Modal";
import { useWt } from "@/providers/context";

export function ReviewEditModal({
  s,
  review,
  onClose,
}: {
  s: Service;
  review: Review;
  onClose: () => void;
}) {
  const wt = useWt();
  const hid = useId();
  const role = review.a.kind === "maker" ? "maker" : "member";
  return (
    <Modal onClose={onClose} labelledBy={hid} width={560}>
      <h3 id={hid}>{review.id ? "리뷰 수정" : "리뷰 작성"}</h3>
      <p className="mb-[18px]">{s.name}</p>
      <ReviewForm
        s={s}
        role={role}
        initial={review.id ? review : null}
        submitLabel={review.id ? "수정 완료" : "리뷰 남기기"}
        onCancel={onClose}
        onSubmit={(v) => {
          if (review.id) wt.updateReview(review.id, v);
          else wt.addReview(s, role, v);
          onClose();
        }}
      />
    </Modal>
  );
}
