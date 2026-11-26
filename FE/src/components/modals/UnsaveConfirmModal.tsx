"use client";

import { useId, useState } from "react";
import type { Service } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { checkClass } from "@/components/ui/field";
import { rememberSkipUnsaveConfirm } from "@/domain/unsave";
import { useWt } from "@/providers/context";
import {
  modalActionButton,
  modalActionsClass,
  modalIconClass,
} from "./modalStyles";

/** 저장한 서비스 목록에서 저장을 해제하기 전에 묻는다(해제하면 목록에서 사라진다) */
export function UnsaveConfirmModal({
  s,
  onClose,
}: {
  s: Service;
  onClose: () => void;
}) {
  const wt = useWt();
  const hid = useId();
  const [skip, setSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Modal onClose={onClose} labelledBy={hid} locked={busy}>
      <div className={`${modalIconClass} bg-light text-ink`}>
        <Icon name="bookmark" size={22} />
      </div>
      <h3 id={hid}>저장을 해제할까요?</h3>
      <p>
        <b className="text-ink">{s.name}</b> — 저장한 서비스 목록에서 사라져요.
      </p>
      <label className={`${checkClass} mt-4`}>
        <input
          type="checkbox"
          checked={skip}
          onChange={(e) => setSkip(e.target.checked)}
        />
        다시 묻지 않기
      </label>
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
          className={modalActionButton}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            if (skip) rememberSkipUnsaveConfirm();
            const ok = await wt.toggleSave(s.id);
            if (ok) onClose();
            else setBusy(false);
          }}
        >
          {busy ? "처리 중…" : "저장 해제"}
        </Button>
      </div>
    </Modal>
  );
}
