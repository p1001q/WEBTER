"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import {
  modalActionButton,
  modalActionsClass,
  modalIconClass,
} from "./modalStyles";

interface ConfirmProps {
  title: string;
  body: ReactNode;
  confirm?: string;
  /** 처리에 성공하면 true. false 면 모달을 닫지 않는다(실패 안내는 호출한 쪽이 띄운다) */
  onConfirm: () => boolean | Promise<boolean>;
  onClose: () => void;
}

export function ConfirmDeleteModal({
  title,
  body,
  confirm = "삭제",
  onConfirm,
  onClose,
}: ConfirmProps) {
  const hid = useId();
  const [busy, setBusy] = useState(false);
  return (
    <Modal onClose={onClose} labelledBy={hid} locked={busy}>
      <div className={`${modalIconClass} bg-wine-50 text-wine`}>
        <Icon name="trash" size={22} />
      </div>
      <h3 id={hid}>{title}</h3>
      <p>{body}</p>
      <div className={modalActionsClass}>
        <Button
          variant="ghost"
          className={modalActionButton}
          disabled={busy}
          onClick={onClose}
        >
          취소
        </Button>
        <Button
          variant="danger"
          className={modalActionButton}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await onConfirm();
            if (ok) onClose();
            else setBusy(false);
          }}
        >
          {busy ? "처리 중…" : confirm}
        </Button>
      </div>
    </Modal>
  );
}
