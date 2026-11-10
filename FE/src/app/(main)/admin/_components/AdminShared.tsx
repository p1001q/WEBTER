"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toApiError } from "@/api/errors";
import { Button } from "@/components/ui/Button";
import { boxClass } from "@/components/ui/box";
import { LoginGate, Restricted } from "@/components/layout/Restricted";
import {
  REPORT_REASON_LABELS,
  REPORT_TARGET_LABELS,
  type ReportReason,
  type ReportRef,
} from "@/domain/report";

export const decisionLabels = {
  RESTORE: "복구",
  HIDE: "최종 비공개",
  DELETE: "삭제",
  DISMISS: "기각",
};

export const sanctionLabels = {
  WARNING: "경고",
  REGISTRATION_RESTRICTED: "서비스 등록 제한",
  SUSPENDED: "계정 이용 제한",
};

export const visibilityLabels = {
  PUBLIC: "공개",
  TEMP_HIDDEN: "임시 비공개",
  HIDDEN: "최종 비공개",
};

const actionLabels: Record<string, string> = {
  ...decisionLabels,
  ...sanctionLabels,
  TEMP_HIDE: "자동 임시 비공개",
};

export const actionName = (type: string) =>
  Object.hasOwn(actionLabels, type) ? actionLabels[type] : type;

export const targetName = ({ targetType, targetId }: ReportRef) =>
  `${REPORT_TARGET_LABELS[targetType]} · ${targetId}`;

export const reasonName = (reason: string) =>
  Object.hasOwn(REPORT_REASON_LABELS, reason)
    ? REPORT_REASON_LABELS[reason as ReportReason]
    : reason;

export const dateTime = (value: string) =>
  new Date(value).toLocaleString("ko-KR");

export function AdminDenied() {
  return (
    <Restricted
      title="관리자만 접근할 수 있어요"
      desc="관리자 권한이 있는 계정으로 로그인해 주세요."
    />
  );
}

export function AdminQuery<T>({
  load,
  children,
}: {
  load: () => Promise<T>;
  children: (data: T) => ReactNode;
}) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<
    { data: T } | { error: ReturnType<typeof toApiError> } | null
  >(null);

  useEffect(() => {
    let current = true;
    load().then(
      (data) => {
        if (current) setResult({ data });
      },
      (error: unknown) => {
        if (current) setResult({ error: toApiError(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [attempt, load]);

  if (!result) return <p role="status">불러오는 중이에요.</p>;
  if ("data" in result) return children(result.data);
  if (result.error.kind === "auth") return <LoginGate />;
  if (result.error.kind === "forbidden") return <AdminDenied />;
  return (
    <div className={`${boxClass} p-4`} role="alert">
      <p>{result.error.message}</p>
      <Button
        variant="ghost"
        onClick={() => {
          setResult(null);
          setAttempt((value) => value + 1);
        }}
      >
        다시 시도
      </Button>
    </div>
  );
}

export function PageControls({
  page,
  hasNext,
  change,
}: {
  page: number;
  hasNext: boolean;
  change: (page: number) => void;
}) {
  if (!page && !hasNext) return null;
  return (
    <nav className="flex items-center gap-3" aria-label="목록 페이지">
      <Button
        size="sm"
        variant="ghost"
        disabled={!page}
        onClick={() => change(page - 1)}
      >
        이전
      </Button>
      <span className="text-13 text-muted">{page + 1}페이지</span>
      <Button
        size="sm"
        variant="ghost"
        disabled={!hasNext}
        onClick={() => change(page + 1)}
      >
        다음
      </Button>
    </nav>
  );
}

export function AdminTable({
  headings,
  children,
}: {
  headings: string[];
  children: ReactNode;
}) {
  return (
    <div className={`${boxClass} overflow-x-auto`}>
      <table className="w-full border-collapse text-left text-14 [&_td]:p-3 [&_th]:p-3 [&_tr+tr]:border-t [&_tr+tr]:border-border">
        <thead className="bg-light">
          <tr>
            {headings.map((heading) => (
              <th key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
