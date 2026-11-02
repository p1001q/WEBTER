"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useWt } from "@/providers/context";
import {
  modalActionButton,
  modalActionsClass,
  modalIconClass,
} from "./modalStyles";

/** 요청이 로그인 만료(401)로 거절됐을 때 */
export function SessionExpiredModal({ onClose }: { onClose: () => void }) {
  const wt = useWt();
  const hid = useId();
  return (
    <Modal onClose={onClose} labelledBy={hid}>
      <div className={`${modalIconClass} bg-butter-50 text-butter-ink`}>
        <Icon name="lock" size={24} />
      </div>
      <h3 id={hid}>로그인이 만료됐어요</h3>
      <p>
        안전을 위해 로그인이 해제됐어요. 방금 한 작업은 처리되지 않았어요.
        <br />
        다시 로그인하면 보던 페이지로 돌아와요.
      </p>
      <div className={modalActionsClass}>
        <Button variant="ghost" className={modalActionButton} onClick={onClose}>
          닫기
        </Button>
        <Button
          className={modalActionButton}
          onClick={() => {
            onClose();
            wt.go("login", { back: wt.currentPath() });
          }}
        >
          다시 로그인
        </Button>
      </div>
    </Modal>
  );
}
