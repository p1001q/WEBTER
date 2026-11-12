export const REPORT_TARGET_LABELS = {
  SERVICE: "서비스",
  REVIEW: "리뷰",
  REVIEW_REPLY: "제작자 답글",
  COMMENT: "댓글",
  PROFILE: "프로필",
} as const;

export type ReportTargetType = keyof typeof REPORT_TARGET_LABELS;

export interface ReportRef {
  targetType: ReportTargetType;
  targetId: string;
}

export interface ReportTarget extends ReportRef {
  label?: string;
}

export const reportKey = ({ targetType, targetId }: ReportRef) =>
  `${targetType}:${targetId}`;

export const REPORT_REASON_LABELS = {
  PHISHING_MALWARE: "피싱·악성",
  INAPPROPRIATE_CONTENT: "부적절 콘텐츠",
  UNREACHABLE: "접속 불가",
  FALSE_INFORMATION: "허위 정보",
  OWNERSHIP: "도용·소유권",
  SPAM_ADVERTISING: "스팸·광고",
  ABUSE: "욕설·비방",
  PERSONAL_INFORMATION: "개인정보 노출",
  INAPPROPRIATE_EXPRESSION: "부적절한 표현",
  SPAM_IMPERSONATION: "스팸·사칭",
  OTHER: "기타",
} as const;

export type ReportReason = keyof typeof REPORT_REASON_LABELS;

const contentReasons = [
  "SPAM_ADVERTISING",
  "ABUSE",
  "PERSONAL_INFORMATION",
  "OTHER",
] as const;

export const REPORT_REASONS: Record<ReportTargetType, readonly ReportReason[]> =
  {
    SERVICE: [
      "PHISHING_MALWARE",
      "INAPPROPRIATE_CONTENT",
      "UNREACHABLE",
      "FALSE_INFORMATION",
      "OWNERSHIP",
      "OTHER",
    ],
    REVIEW: contentReasons,
    REVIEW_REPLY: contentReasons,
    COMMENT: contentReasons,
    PROFILE: [
      "INAPPROPRIATE_EXPRESSION",
      "SPAM_IMPERSONATION",
      "PERSONAL_INFORMATION",
      "OTHER",
    ],
  };

export interface ReportInput extends ReportRef {
  reason: ReportReason;
  detail?: string;
}

export interface ReportReceipt {
  id: string;
  temporarilyHidden: boolean;
}

export const HIDDEN_NICKNAME = "비공개 닉네임";
