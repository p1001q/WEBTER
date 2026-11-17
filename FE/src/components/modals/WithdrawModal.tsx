"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { checkClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { DEPARTED_MEMBER_NAME } from "@/domain/policy";
import { useWt } from "@/providers/context";
import {
  modalActionButton,
  modalActionsClass,
  modalIconClass,
} from "./modalStyles";

export function WithdrawModal({ onClose }: { onClose: () => void }) {
  const wt = useWt();
  const hid = useId();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Modal onClose={onClose} labelledBy={hid} width={480} locked={busy}>
      <div className={`${modalIconClass} bg-wine-50 text-wine`}>
        <Icon name="alert" size={22} />
      </div>
      <h3 id={hid}>정말 탈퇴할까요?</h3>
      <ul className="mt-2 list-disc pl-[18px] text-14 leading-[1.8] text-text-2">
        <li>
          등록한 서비스는 모두 <b>삭제</b>돼요.
        </li>
        <li>
          작성한 리뷰와 댓글은 <b>“{DEPARTED_MEMBER_NAME}”</b> 이름으로 남아요.
        </li>
        <li>
          저장 기록은 <b>삭제</b>돼요.
        </li>
      </ul>
      <label className={`${checkClass} mt-4`}>
        <input
          type="checkbox"
          checked={ok}
          onChange={(e) => setOk(e.target.checked)}
        />
        위 내용을 확인했어요.
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
          variant="danger"
          className={modalActionButton}
          disabled={!ok || busy}
          onClick={async () => {
            setBusy(true);
            if (await wt.withdraw()) onClose();
            else setBusy(false);
          }}
        >
          {busy ? "처리 중…" : "탈퇴하기"}
        </Button>
      </div>
    </Modal>
  );
}
