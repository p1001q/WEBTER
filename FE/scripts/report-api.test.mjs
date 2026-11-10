import assert from "node:assert/strict";
import { test } from "node:test";
import { harness } from "./helpers/uiHarness.mjs";

test("제작자 답글 신고는 리뷰 ID 대신 답글 UUID와 사유 코드를 보낸다", async () => {
  const calls = [];
  const receipt = { id: "17", temporarilyHidden: true };
  const h = harness({
    "../auth/http": {
      postJson: async (...args) => {
        calls.push(args);
        return receipt;
      },
    },
  });
  const { submitReport } = h.load("api/real/reportApi.ts");
  const input = {
    targetType: "REVIEW_REPLY",
    targetId: "f2c5a55c-30d1-4c60-8dd0-24244b96f9e1",
    reason: "OTHER",
    detail: "기타 신고 사유",
  };
  assert.deepEqual(await submitReport(input), receipt);
  assert.deepEqual(calls, [["/api/reports", input]]);
});

test("관리자 API는 조회 조건과 필수 조치 사유를 보낸다", async () => {
  const calls = [];
  const h = harness({
    "../auth/http": {
      getJson: async (path) => calls.push(["GET", path]),
      postJson: async (path, data) => calls.push(["POST", path, data]),
    },
  });
  const { adminApi } = h.load("api/real/adminApi.ts");
  const target = { targetType: "SERVICE", targetId: "42" };
  const memberId = "f2c5a55c-30d1-4c60-8dd0-24244b96f9e1";
  await adminApi.reports(2, false);
  await adminApi.detail(target, 1);
  await adminApi.resolve(target, "RESTORE", "검토 완료");
  await adminApi.sanction(
    memberId,
    "REGISTRATION_RESTRICTED",
    "등록 정책 위반",
  );
  assert.deepEqual(calls, [
    ["GET", "/api/admin/reports?page=2&pendingOnly=false"],
    ["GET", "/api/admin/reports/SERVICE/42?page=1"],
    [
      "POST",
      "/api/admin/reports/SERVICE/42/actions",
      { action: "RESTORE", reason: "검토 완료" },
    ],
    [
      "POST",
      `/api/admin/users/${memberId}/sanctions`,
      { action: "REGISTRATION_RESTRICTED", reason: "등록 정책 위반" },
    ],
  ]);
});
