"use client";

import { useState } from "react";
import { realAuth } from "@/api/auth/config";
import { adminApi, type Sanction } from "@/api/real/adminApi";
import { Footer } from "@/components/layout/Footer";
import { LoginGate } from "@/components/layout/Restricted";
import { Button } from "@/components/ui/Button";
import { fieldClass, inputClass, labelClass } from "@/components/ui/field";
import { reportKey, type ReportRef } from "@/domain/report";
import { useWt } from "@/providers/context";
import { AdminActionForm } from "./AdminActionForm";
import { AdminDetail } from "./AdminDetail";
import {
  actionName,
  AdminDenied,
  AdminQuery,
  AdminTable,
  dateTime,
  PageControls,
  sanctionLabels,
  targetName,
} from "./AdminShared";

const sections = {
  reports: "신고 목록",
  hidden: "임시 비공개",
  sanctions: "회원 제재",
  history: "조치 이력",
} as const;
type Section = keyof typeof sections;
const tabs = Object.keys(sections) as Section[];
const memberIdPattern =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

export function AdminScreen() {
  const wt = useWt();
  if (!wt.sessionReady)
    return (
      <p className="page-wrap" role="status">
        세션을 확인하는 중이에요.
      </p>
    );
  if (!wt.me) return <LoginGate />;
  if (!realAuth || wt.me.role !== "ADMIN") return <AdminDenied />;
  return <AdminWorkspace key={wt.me.id} />;
}

function AdminWorkspace() {
  const [section, setSection] = useState<Section>("reports");
  const [page, setPage] = useState(0);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [target, setTarget] = useState<ReportRef>();
  const [memberId, setMemberId] = useState("");
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");

  const openSection = (next: Section) => {
    setSection(next);
    setPage(0);
    setTarget(undefined);
  };
  const refresh = () => {
    setRevision((value) => value + 1);
    setNotice("조치를 기록했어요.");
  };
  const queryKey = `${section}:${page}:${revision}:${pendingOnly}`;
  return (
    <>
      <div className="page-wrap grid gap-5 py-8">
        <h1 className="m-0 text-28 font-extrabold">관리자 페이지</h1>
        <nav className="flex flex-wrap gap-2" aria-label="관리자 메뉴">
          {tabs.map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={section === tab ? "primary" : "ghost"}
              aria-pressed={section === tab}
              onClick={() => openSection(tab)}
            >
              {sections[tab]}
            </Button>
          ))}
        </nav>
        {notice && (
          <p className="m-0 text-14 text-navy" role="status">
            {notice}
          </p>
        )}
        {target ? (
          <AdminDetail
            key={reportKey(target)}
            target={target}
            revision={revision}
            onClose={() => setTarget(undefined)}
            onSuccess={refresh}
            onSanction={(id) => {
              setMemberId(id);
              openSection("sanctions");
            }}
          />
        ) : section === "reports" ? (
          <>
            <label className="flex items-center gap-2 text-14">
              <input
                type="checkbox"
                className="accent-navy"
                checked={pendingOnly}
                onChange={(e) => {
                  setPendingOnly(e.target.checked);
                  setPage(0);
                }}
              />
              처리 대기만 보기
            </label>
            <AdminQuery
              key={queryKey}
              load={() => adminApi.reports(page, pendingOnly)}
            >
              {({ groups, pendingCount }) => (
                <>
                  <p className="m-0 font-bold">
                    전체 처리 대기 {pendingCount}건
                  </p>
                  {groups.items.length ? (
                    <AdminTable
                      headings={["대상", "신고 건수", "대기 건수", "최근 신고"]}
                    >
                      {groups.items.map((group) => (
                        <tr key={reportKey(group.target)}>
                          <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTarget(group.target)}
                            >
                              {targetName(group.target)}
                            </Button>
                          </td>
                          <td>{group.reportCount}</td>
                          <td>{group.pendingCount}</td>
                          <td>{dateTime(group.latestAt)}</td>
                        </tr>
                      ))}
                    </AdminTable>
                  ) : (
                    <p>이 페이지에 표시할 신고가 없어요.</p>
                  )}
                  <PageControls
                    page={page}
                    hasNext={groups.hasNext}
                    change={setPage}
                  />
                </>
              )}
            </AdminQuery>
          </>
        ) : section === "hidden" ? (
          <AdminQuery
            key={queryKey}
            load={() => adminApi.temporarilyHidden(page)}
          >
            {({ items, hasNext }) => (
              <>
                {items.length ? (
                  <AdminTable
                    headings={["대상", "미리보기 제목", "임시 비공개 사유"]}
                  >
                    {items.map(({ target, preview }) => (
                      <tr key={reportKey(target)}>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTarget(target)}
                          >
                            {targetName(target)}
                          </Button>
                        </td>
                        <td>{preview.title}</td>
                        <td>{preview.hiddenReason ?? "—"}</td>
                      </tr>
                    ))}
                  </AdminTable>
                ) : (
                  <p>이 페이지에 임시 비공개 대상이 없어요.</p>
                )}
                <PageControls page={page} hasNext={hasNext} change={setPage} />
              </>
            )}
          </AdminQuery>
        ) : section === "sanctions" ? (
          <AdminActionForm
            title="회원 제재 지정"
            options={(Object.keys(sanctionLabels) as Sanction[]).map(
              (value) => ({ value, label: sanctionLabels[value] }),
            )}
            submit={(action, reason) =>
              adminApi.sanction(memberId.trim(), action, reason)
            }
            onSuccess={refresh}
          >
            <label className={fieldClass}>
              <span className={labelClass}>회원 ID</span>
              <input
                className={inputClass}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                required
                pattern={memberIdPattern}
                maxLength={36}
                placeholder="회원 UUID"
              />
            </label>
          </AdminActionForm>
        ) : (
          <AdminQuery key={queryKey} load={() => adminApi.history(page)}>
            {({ items, hasNext }) => (
              <>
                {items.length ? (
                  <AdminTable
                    headings={["시각", "대상", "조치", "사유", "처리자"]}
                  >
                    {items.map((action) => (
                      <tr key={action.id}>
                        <td>{dateTime(action.createdAt)}</td>
                        <td>{targetName(action.target)}</td>
                        <td>{actionName(action.type)}</td>
                        <td className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                          {action.reason}
                        </td>
                        <td>
                          {action.automatic
                            ? "자동"
                            : (action.actorId ?? "탈퇴한 관리자")}
                        </td>
                      </tr>
                    ))}
                  </AdminTable>
                ) : (
                  <p>이 페이지에 조치 이력이 없어요.</p>
                )}
                <PageControls page={page} hasNext={hasNext} change={setPage} />
              </>
            )}
          </AdminQuery>
        )}
      </div>
      <Footer />
    </>
  );
}
