"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { textareaClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useWt } from "@/providers/context";
import type { ReportTarget } from "@/providers/types";
import {
  modalActionButton,
  modalActionsClass,
  modalIconClass,
} from "./modalStyles";

const REPORT_REASONS: Record<ReportTarget["type"], string[]> = {
  service: [
    "피싱·악성",
    "부적절 콘텐츠",
    "접속 불가",
    "허위 정보",
    "도용·소유권",
    "기타",
  ],
  review: ["스팸·광고", "욕설·비방", "개인정보 노출", "기타"],
  reply: ["스팸·광고", "욕설·비방", "개인정보 노출", "기타"],
  profile: ["부적절한 표현", "스팸·사칭", "개인정보 노출", "기타"],
};
const REPORT_TARGET: Record<ReportTarget["type"], string> = {
  service: "서비스",
  review: "리뷰",
  reply: "제작자 답글",
  profile: "프로필",
};

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
  const [reason, setReason] = useState(target.preset || "");
  const [etc, setEtc] = useState("");
  const need = reason === "기타" && !etc.trim();
  const submit = () => {
    wt.report(target.key);
    onClose();
    wt.toast("신고가 접수됐어요. 같은 대상은 한 번만 신고할 수 있어요.");
  };
  return (
    <Modal onClose={onClose} labelledBy={hid} width={460}>
      <div className={`${modalIconClass} bg-wine-50 text-wine`}>
        <Icon name="flag" size={22} />
      </div>
      <h3 id={hid}>{REPORT_TARGET[target.type]} 신고</h3>
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
        {REPORT_REASONS[target.type].map((r) => (
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
            {r}
          </label>
        ))}
      </div>
      {reason === "기타" && (
        <textarea
          className={textareaClass}
          style={{ marginTop: 10, minHeight: 80 }}
          placeholder="신고 사유를 적어 주세요"
          value={etc}
          onChange={(e) => setEtc(e.target.value)}
          aria-label="기타 신고 사유"
        />
      )}
      <p className="mt-3">허위 신고가 반복되면 이용이 제한될 수 있어요.</p>
      <div className={modalActionsClass}>
        <Button variant="ghost" className={modalActionButton} onClick={onClose}>
          취소
        </Button>
        <Button
          variant="danger"
          className={modalActionButton}
          disabled={!reason || need}
          onClick={submit}
        >
          신고하기
        </Button>
      </div>
    </Modal>
  );
}
