"use client";

import { Icon } from "@/components/ui/Icon";
import { MiniButton } from "@/components/ui/MiniButton";
import { reportKey, type ReportTarget } from "@/domain/report";
import { useWt } from "@/providers/context";

export function ReportButton({
  target,
  className,
  children = "신고",
}: {
  target: ReportTarget;
  className?: string;
  children?: string;
}) {
  const wt = useWt();
  const reported = wt.reported.has(reportKey(target));
  return (
    <MiniButton
      className={className}
      disabled={reported}
      onClick={() =>
        wt.requireLogin(
          () => wt.setModal({ type: "report", target }),
          "신고는 로그인한 회원만 할 수 있어요.",
        )
      }
    >
      <Icon name={reported ? "check" : "flag"} size={13} />
      {reported ? "신고 완료" : children}
    </MiniButton>
  );
}
