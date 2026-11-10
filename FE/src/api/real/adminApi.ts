import type { ReportRef } from "@/domain/report";
import { getJson, postJson } from "../auth/http";

export interface AdminPage<T> {
  items: T[];
  page: number;
  hasNext: boolean;
}

export interface TargetPreview {
  title: string;
  content: string | null;
  authorId: string | null;
  serviceId: string | null;
  visibility: "PUBLIC" | "TEMP_HIDDEN" | "HIDDEN";
  hiddenReason: string | null;
}

export interface ReportGroup {
  target: ReportRef;
  reportCount: number;
  pendingCount: number;
  latestAt: string;
}

export interface ReportEntry {
  id: string;
  reason: string;
  detail: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reviewedAt: string | null;
  resolutionNote: string | null;
}

export interface ReportDetail {
  target: ReportRef;
  preview: TargetPreview | null;
  reportCount: number;
  pendingCount: number;
  reasons: { reason: string; count: number }[];
  reports: AdminPage<ReportEntry>;
}

export type ModerationDecision = "RESTORE" | "HIDE" | "DELETE" | "DISMISS";
export type Sanction = "WARNING" | "REGISTRATION_RESTRICTED" | "SUSPENDED";

export interface ModerationAction {
  id: string;
  target: ReportRef;
  type: string;
  reason: string;
  actorId: string | null;
  automatic: boolean;
  createdAt: string;
}

const reportsPath = "/api/admin/reports";
const detailPath = ({ targetType, targetId }: ReportRef) =>
  `${reportsPath}/${targetType}/${encodeURIComponent(targetId)}`;

export const adminApi = {
  reports: (page: number, pendingOnly: boolean) =>
    getJson<{ groups: AdminPage<ReportGroup>; pendingCount: number }>(
      `${reportsPath}?page=${page}&pendingOnly=${pendingOnly}`,
    ),
  detail: (target: ReportRef, page: number) =>
    getJson<ReportDetail>(`${detailPath(target)}?page=${page}`),
  temporarilyHidden: (page: number) =>
    getJson<AdminPage<{ target: ReportRef; preview: TargetPreview }>>(
      `/api/admin/temporarily-hidden?page=${page}`,
    ),
  history: (page: number) =>
    getJson<AdminPage<ModerationAction>>(
      `/api/admin/moderation-actions?page=${page}`,
    ),
  resolve: (target: ReportRef, action: ModerationDecision, reason: string) =>
    postJson<ModerationAction>(`${detailPath(target)}/actions`, {
      action,
      reason,
    }),
  sanction: (id: string, action: Sanction, reason: string) =>
    postJson<ModerationAction>(
      `/api/admin/users/${encodeURIComponent(id)}/sanctions`,
      { action, reason },
    ),
};
