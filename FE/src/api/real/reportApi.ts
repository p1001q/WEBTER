import type { ReportInput, ReportReceipt } from "@/domain/report";
import { postJson } from "../auth/http";

export const submitReport = (input: ReportInput) =>
  postJson<ReportReceipt>("/api/reports", input);
