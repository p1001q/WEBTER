"use client";

import { useId, type ReactNode } from "react";
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
  onConfirm: () => void;
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
  return (
    <Modal onClose={onClose} labelledBy={hid}>
      <div className={`${modalIconClass} bg-wine-50 text-wine`}>
        <Icon name="trash" size={22} />
      </div>
      <h3 id={hid}>{title}</h3>
      <p>{body}</p>
      <div className={modalActionsClass}>
        <Button variant="ghost" className={modalActionButton} onClick={onClose}>
          취소
        </Button>
        <Button
          variant="danger"
          className={modalActionButton}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirm}
        </Button>
      </div>
    </Modal>
  );
}
