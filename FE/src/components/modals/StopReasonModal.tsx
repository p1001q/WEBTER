"use client";

import { useId, useState } from "react";
import type { Service } from "@/api/types";
import { Button } from "@/components/ui/Button";
import {
  counterClass,
  fieldClass,
  inputClass,
  labelClass,
  requiredMarkClass,
} from "@/components/ui/field";
import { Modal } from "@/components/ui/Modal";
import { modalActionButton, modalActionsClass } from "./modalStyles";

const MAX = 60;

export function StopReasonModal({
  s,
  onConfirm,
  onClose,
}: {
  s: Service;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const hid = useId();
  const fid = useId();
  const [v, setV] = useState(s.stopReason || "");
  return (
    <Modal onClose={onClose} labelledBy={hid} width={460}>
      <h3 id={hid}>사용 불가능으로 바꿀까요?</h3>
      <p>
        <b className="text-ink">{s.name}</b>의 이용하기 버튼이 비활성화되고,
        기본 목록에서 숨겨져요. 상세 페이지 상단에 아래 사유가 표시돼요.
      </p>
      <div className={`${fieldClass} mt-[18px]`}>
        <label className={labelClass} htmlFor={fid}>
          사유 한 줄 <span className={requiredMarkClass}>*</span>
          <span className={counterClass}>
            {v.length}/{MAX}
          </span>
        </label>
        <input
          id={fid}
          className={inputClass}
          maxLength={MAX}
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="예: 서버 점검으로 11월 3일까지 이용할 수 없어요"
        />
      </div>
      <div className={modalActionsClass}>
        <Button variant="ghost" className={modalActionButton} onClick={onClose}>
          취소
        </Button>
        <Button
          className={modalActionButton}
          disabled={!v.trim()}
          onClick={() => {
            onConfirm(v.trim());
            onClose();
          }}
        >
          사용 불가능으로 변경
        </Button>
      </div>
    </Modal>
  );
}
