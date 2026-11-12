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

export function LoginPromptModal({
  reason,
  onClose,
}: {
  reason?: string;
  onClose: () => void;
}) {
  const wt = useWt();
  const hid = useId();
  return (
    <Modal onClose={onClose} labelledBy={hid}>
      <div className={`${modalIconClass} bg-butter-50 text-butter-ink`}>
        <Icon name="user" size={24} />
      </div>
      <h3 id={hid}>로그인이 필요해요</h3>
      <p>
        {reason || "이 기능은 로그인한 회원만 이용할 수 있어요."}
        <br />
        구글 계정으로 바로 시작할 수 있고, 로그인 후 보던 페이지로 돌아와요.
      </p>
      <div className={modalActionsClass}>
        <Button variant="ghost" className={modalActionButton} onClick={onClose}>
          나중에
        </Button>
        <Button
          className={modalActionButton}
          onClick={() => {
            onClose();
            wt.go("login", { back: wt.currentPath() });
          }}
        >
          로그인하기
        </Button>
      </div>
    </Modal>
  );
}
