"use client";

import { useWt } from "@/providers/context";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { Lightbox } from "@/components/service/Lightbox";
import { LoginPromptModal } from "./LoginPromptModal";
import { ReportModal } from "./ReportModal";
import { ReviewEditModal } from "./ReviewEditModal";
import { StopReasonModal } from "./StopReasonModal";
import { VersionModal } from "./VersionModal";
import { WithdrawModal } from "./WithdrawModal";

/**
 * 모달 상태(`wt.modal`)에 맞는 모달을 그린다.
 */
export function ModalHost() {
  const wt = useWt();
  const m = wt.modal;
  if (!m) return null;
  const close = () => wt.setModal(null);
  const s = "sid" in m ? wt.svc(m.sid) : undefined;
  switch (m.type) {
    case "login":
      return <LoginPromptModal reason={m.reason} onClose={close} />;
    case "report":
      return <ReportModal target={m.target} onClose={close} />;
    case "delete":
      return s ? (
        <ConfirmDeleteModal
          title="서비스를 삭제할까요?"
          body={
            <>
              <b className="text-ink">{s.name}</b> — 서비스와 리뷰가 함께
              삭제됩니다. 삭제하면 되돌릴 수 없어요.
            </>
          }
          onConfirm={() => wt.deleteService(s.id)}
          onClose={close}
        />
      ) : null;
    case "delete-review":
      return (
        <ConfirmDeleteModal
          title="리뷰를 삭제할까요?"
          body="삭제한 리뷰는 되돌릴 수 없어요."
          onConfirm={() => wt.deleteReview(m.rid)}
          onClose={close}
        />
      );
    case "stop":
      return s ? (
        <StopReasonModal
          s={s}
          onConfirm={(r) => {
            wt.updateService(s.id, { use: "stop", stopReason: r });
            wt.toast("사용 불가능으로 바꿨어요.");
          }}
          onClose={close}
        />
      ) : null;
    case "review":
      return s ? (
        <ReviewEditModal s={s} review={m.review} onClose={close} />
      ) : null;
    case "versions":
      return s ? <VersionModal s={s} onClose={close} /> : null;
    case "lightbox":
      return s ? <Lightbox s={s} index={m.index} onClose={close} /> : null;
    case "withdraw":
      return <WithdrawModal onClose={close} />;
    default:
      return null;
  }
}
