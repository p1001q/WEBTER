"use client";

import { useId } from "react";
import type { Rate, Review, Service } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useWt } from "@/providers/context";
import {
  modalActionButton,
  modalActionsClass,
  modalIconClass,
} from "./modalStyles";

/** 이미 리뷰를 남긴 서비스에서 추천·비추천을 누르면, 리뷰를 수정할지 묻고 수정 창으로 이어 준다 */
export function ReviewRateConfirmModal({
  s,
  review,
  rate,
  onClose,
}: {
  s: Service;
  review: Review;
  rate: Rate;
  onClose: () => void;
}) {
  const wt = useWt();
  const hid = useId();
  return (
    <Modal onClose={onClose} labelledBy={hid}>
      <div className={`${modalIconClass} bg-navy-50 text-navy`}>
        <Icon name="edit" size={24} />
      </div>
      <h3 id={hid}>리뷰를 수정할까요?</h3>
      <p>이미 리뷰를 남긴 서비스예요. 평가를 바꾸려면 리뷰를 수정해야 해요.</p>
      <div className={modalActionsClass}>
        <Button variant="ghost" className={modalActionButton} onClick={onClose}>
          취소
        </Button>
        <Button
          className={modalActionButton}
          onClick={() =>
            // 고른 평가가 미리 선택된 리뷰 수정 창으로 바꾼다
            wt.setModal({
              type: "review",
              sid: s.id,
              review: { ...review, rate },
            })
          }
        >
          리뷰 수정하기
        </Button>
      </div>
    </Modal>
  );
}
