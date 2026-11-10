"use client";

import { useState } from "react";
import {
  adminApi,
  type ModerationDecision,
  type ReportDetail,
} from "@/api/real/adminApi";
import { boxClass } from "@/components/ui/box";
import { Button } from "@/components/ui/Button";
import type { ReportRef } from "@/domain/report";
import { AdminActionForm } from "./AdminActionForm";
import {
  AdminQuery,
  AdminTable,
  dateTime,
  decisionLabels,
  PageControls,
  reasonName,
  targetName,
  visibilityLabels,
} from "./AdminShared";

const statuses = { OPEN: "대기", RESOLVED: "처리", DISMISSED: "기각" };

function availableActions({ target, preview, pendingCount }: ReportDetail) {
  const values: ModerationDecision[] = [];
  if (preview) {
    if (preview.visibility !== "PUBLIC") values.push("RESTORE");
    if (preview.visibility !== "HIDDEN") values.push("HIDE");
    if (target.targetType !== "PROFILE") values.push("DELETE");
  }
  if (pendingCount) values.push("DISMISS");
  return values.map((value) => ({ value, label: decisionLabels[value] }));
}

export function AdminDetail({
  target,
  revision,
  onClose,
  onSuccess,
  onSanction,
}: {
  target: ReportRef;
  revision: number;
  onClose: () => void;
  onSuccess: () => void;
  onSanction: (memberId: string) => void;
}) {
  const [page, setPage] = useState(0);
  return (
    <section className="grid gap-4" aria-label="신고 상세">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-20 font-bold">신고 상세</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          목록으로
        </Button>
      </div>
      <AdminQuery
        key={`${page}:${revision}`}
        load={() => adminApi.detail(target, page)}
      >
        {(detail) => {
          const { preview, reports } = detail;
          const options = availableActions(detail);
          return (
            <>
              <div className={`${boxClass} grid gap-2 p-4`}>
                <h3 className="m-0 text-18 font-bold">
                  {preview?.title ?? "삭제되었거나 확인할 수 없는 대상"}
                </h3>
                <span className="break-all text-13 text-muted">
                  {targetName(target)}
                </span>
                {preview && (
                  <>
                    <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {preview.content}
                    </p>
                    <span>
                      {visibilityLabels[preview.visibility]}
                      {preview.hiddenReason && ` · ${preview.hiddenReason}`}
                    </span>
                    {preview.serviceId && (
                      <span className="text-13 text-muted">
                        서비스 ID {preview.serviceId}
                      </span>
                    )}
                    {preview.authorId && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-all text-13 text-muted">
                          작성 회원 {preview.authorId}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onSanction(preview.authorId!)}
                        >
                          작성 회원 제재
                        </Button>
                      </div>
                    )}
                  </>
                )}
                <strong>
                  신고 {detail.reportCount}건 · 대기 {detail.pendingCount}건
                </strong>
                <ul className="m-0 flex flex-wrap gap-3 p-0">
                  {detail.reasons.map(({ reason, count }) => (
                    <li className="list-none text-13 text-muted" key={reason}>
                      {reasonName(reason)} {count}건
                    </li>
                  ))}
                </ul>
              </div>
              {options.length > 0 && (
                <AdminActionForm
                  title="신고 대상 조치"
                  options={options}
                  submit={(action, reason) =>
                    adminApi.resolve(target, action, reason)
                  }
                  onSuccess={() => {
                    setPage(0);
                    onSuccess();
                  }}
                />
              )}
              {reports.items.length > 0 && (
                <AdminTable
                  headings={["신고 사유", "상태", "접수 시각", "조치 사유"]}
                >
                  {reports.items.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        {reasonName(entry.reason)}
                        {entry.detail && (
                          <p className="mb-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
                            {entry.detail}
                          </p>
                        )}
                      </td>
                      <td>{statuses[entry.status]}</td>
                      <td>{dateTime(entry.createdAt)}</td>
                      <td className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {entry.resolutionNote ?? "—"}
                      </td>
                    </tr>
                  ))}
                </AdminTable>
              )}
              <PageControls
                page={page}
                hasNext={reports.hasNext}
                change={setPage}
              />
            </>
          );
        }}
      </AdminQuery>
    </section>
  );
}
