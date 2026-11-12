"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { textareaClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useWt } from "@/providers/context";
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_TARGET_LABELS,
  type ReportReason,
  type ReportTarget,
} from "@/domain/report";
import {
  modalActionButton,
  modalActionsClass,
  modalIconClass,
} from "./modalStyles";

export function ReportModal({
  target,
  onClose,
}: {
  target: ReportTarget;
  onClose: () => void;
}) {
  const wt = useWt();
  const hid = useId();
  const name = useId();
  const [reason, setReason] = useState<ReportReason>();
  const [etc, setEtc] = useState("");
  const [busy, setBusy] = useState(false);
  const need = reason === "OTHER" && !etc.trim();
  const submit = async () => {
    if (!reason || need || busy) return;
    setBusy(true);
    const receipt = await wt.report({
      targetType: target.targetType,
      targetId: target.targetId,
      reason,
      detail: reason === "OTHER" ? etc.trim() : undefined,
    });
    if (!receipt) {
      setBusy(false);
      return;
    }
    onClose();
    if (receipt.temporarilyHidden) {
      window.location.reload();
      return;
    }
    wt.toast("신고가 접수됐어요. 같은 대상은 한 번만 신고할 수 있어요.");
  };
  return (
    <Modal onClose={onClose} labelledBy={hid} width={460} locked={busy}>
      <div className={`${modalIconClass} bg-wine-50 text-wine`}>
        <Icon name="flag" size={22} />
      </div>
      <h3 id={hid}>{REPORT_TARGET_LABELS[target.targetType]} 신고</h3>
      <p>
        {target.label ? (
          <>
            <b className="text-ink">{target.label}</b>을(를) 신고하는 이유를
            골라 주세요.
          </>
        ) : (
          "신고하는 이유를 골라 주세요."
        )}
      </p>
      <div
        className="mt-4 flex flex-col gap-1.5"
        role="radiogroup"
        aria-label="신고 사유"
      >
        {REPORT_REASONS[target.targetType].map((r) => (
          <label
            key={r}
            className="flex h-11 cursor-pointer items-center gap-2.5 rounded-md border border-border px-3.5 text-14 has-[input:checked]:border-navy has-[input:checked]:bg-navy-50"
          >
            <input
              type="radio"
              name={name}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="m-0 size-4 accent-navy"
            />
            {REPORT_REASON_LABELS[r]}
          </label>
        ))}
      </div>
      {reason === "OTHER" && (
        <textarea
          className={textareaClass}
          style={{ marginTop: 10, minHeight: 80 }}
          placeholder="신고 사유를 적어 주세요"
          maxLength={1000}
          value={etc}
          onChange={(e) => setEtc(e.target.value)}
          aria-label="기타 신고 사유"
        />
      )}
      <p className="mt-3">신고자 정보는 작성자에게 공개되지 않아요.</p>
      <div className={modalActionsClass}>
        <Button variant="ghost" className={modalActionButton} onClick={onClose}>
          취소
        </Button>
        <Button
          variant="danger"
          className={modalActionButton}
          disabled={!reason || need || busy}
          onClick={submit}
        >
          {busy ? "접수 중…" : "신고하기"}
        </Button>
      </div>
    </Modal>
  );
}
