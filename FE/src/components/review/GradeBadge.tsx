import type { Grade } from "@/api/types";
import { fmtNum } from "@/domain/format";
import { GRADE_LABEL, ratioText } from "@/domain/review";
import { cx } from "@/lib/cx";

const TONE: Record<Grade, string> = {
  vpos: "bg-grade-vpos-bg text-grade-vpos-fg",
  pos: "bg-grade-pos-bg text-grade-pos-fg",
  mpos: "border border-navy-50 bg-grade-mpos-bg text-grade-mpos-fg",
  mixed: "bg-grade-mixed-bg text-grade-mixed-fg",
  mneg: "border border-wine-50 bg-grade-mneg-bg text-grade-mneg-fg",
  neg: "bg-grade-neg-bg text-grade-neg-fg",
  vneg: "bg-grade-vneg-bg text-grade-vneg-fg",
  few: "bg-grade-few-bg text-grade-few-fg",
};

interface GradeBadgeProps {
  grade: Grade;
  count?: number | null;
  ratio?: number | null;
  showRatio?: boolean;
  /** lg: 서비스 카드 위에 얹는 큰 크기(26px) */
  size?: "md" | "lg";
  className?: string;
}

/** 리뷰 평가 등급 배지(8종) */
export function GradeBadge({
  grade,
  count,
  ratio,
  showRatio,
  size = "md",
  className,
}: GradeBadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-[5px] rounded-sm font-bold tracking-[-0.01em] whitespace-nowrap",
        size === "lg"
          ? "h-[26px] px-[9px] text-12"
          : "h-[22px] px-2 text-[11.5px]",
        TONE[grade],
        className,
      )}
    >
      {GRADE_LABEL[grade]}
      {count != null && <span className="font-medium">({fmtNum(count)})</span>}
      {showRatio && ratio != null && grade !== "few" && (
        <span className="font-medium">· 추천 {ratioText(ratio)}</span>
      )}
    </span>
  );
}
