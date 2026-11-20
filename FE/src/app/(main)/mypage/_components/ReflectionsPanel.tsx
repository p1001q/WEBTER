"use client";

import { useEffect, useId, useState } from "react";
import {
  reflectionApi,
  type ReflectionApi,
  type ReflectionEntry,
  type ReflectionPage,
} from "@/api/real/reflectionApi";
import { toApiError } from "@/api/errors";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";
import { ReflectionWritePanel } from "./ReflectionWritePanel";
import { inputClass, labelClass, selectClass } from "@/components/ui/field";
import { useWt } from "@/providers/context";

export function ReflectionsPanel() {
  const wt = useWt();
  const [tab, setTab] = useState<"write" | "list">("write");
  const [revision, setRevision] = useState(0);
  const userId = wt.me!.id;
  const services = wt.services.filter((service) => service.owner === userId);
  return (
    <>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ["write", "작성"],
          ["list", "목록"],
        ]}
      />
      <div hidden={tab !== "write"}>
        <ReflectionWritePanel
          key={`${userId}|${revision}`}
          userId={userId}
          services={services.map(({ id, name }) => ({ id, name }))}
          onSaved={() => {
            setRevision((n) => n + 1);
            setTab("list");
          }}
        />
      </div>
      <div hidden={tab !== "list"}>
        <ReflectionsHome
          key={`${userId}|${revision}`}
          userId={userId}
          onWrite={() => setTab("write")}
        />
      </div>
    </>
  );
}

function ReflectionsHome({
  userId,
  onWrite,
}: {
  userId: string;
  onWrite: () => void;
}) {
  const wt = useWt();
  const services = wt.services.filter((service) => service.owner === userId);
  const [api] = useState(() => reflectionApi(userId));
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const [refresh, setRefresh] = useState(0);
  const key = `${page}|${filter}|${refresh}`;
  const [result, setResult] = useState<{
    key: string;
    data?: ReflectionPage;
    error?: string;
  }>();
  const [editor, setEditor] = useState<ReflectionEntry | "new" | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [openError, setOpenError] = useState("");
  useEffect(() => {
    let alive = true;
    api.list(page, filter).then(
      (data) => {
        if (alive) setResult({ key, data });
      },
      (error: unknown) => {
        if (alive) setResult({ key, error: toApiError(error).message });
      },
    );
    return () => {
      alive = false;
    };
  }, [api, page, filter, key]);
  const data = result?.key === key ? result.data : undefined;
  const error = result?.key === key ? result.error : undefined;
  return (
    <section className="max-w-[900px]" aria-label="내 회고">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-20 font-bold">서비스 회고</h2>
          <p className="mt-1 text-13 text-muted">
            서비스를 만들며 배운 점과 다음 계획을 남겨보세요. 작성한 회고는 나만
            볼 수 있어요.
          </p>
        </div>
        <Button disabled={!services.length || !!opening} onClick={onWrite}>
          회고 쓰기
        </Button>
      </div>
      {!services.length && (
        <p className="mb-4 text-13 text-muted">
          내가 등록한 서비스가 있으면 새 회고를 작성할 수 있어요.
        </p>
      )}
      <label className="mb-5 flex max-w-[320px] flex-col gap-2 text-13 font-semibold">
        서비스별 보기
        <select
          className={selectClass}
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="">전체 서비스</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>
      {openError && (
        <p role="alert" className="mb-4 text-13 text-wine">
          {openError}
        </p>
      )}
      {error ? (
        <div role="alert">
          <p className="mb-3 text-wine">회고를 불러오지 못했어요. {error}</p>
          <Button variant="ghost" onClick={() => setRefresh((n) => n + 1)}>
            다시 시도
          </Button>
        </div>
      ) : !data ? (
        <p role="status" className="py-10 text-muted">
          회고를 불러오고 있어요…
        </p>
      ) : !data.total ? (
        <EmptyState
          icon="edit"
          title="아직 작성한 회고가 없어요"
          desc="만든 서비스와 함께 나만의 개발 기록을 남겨보세요."
        />
      ) : (
        <>
          <ul className="m-0 list-none divide-y divide-border p-0">
            {data.items.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-5 text-left hover:bg-light disabled:opacity-60"
                  disabled={!!opening}
                  onClick={async () => {
                    setOpening(note.id);
                    setOpenError("");
                    try {
                      setEditor(await api.get(note.id));
                    } catch (error) {
                      setOpenError(toApiError(error).message);
                    } finally {
                      setOpening(null);
                    }
                  }}
                >
                  <span className="text-12 text-muted">
                    {note.serviceName}
                    {note.serviceId == null && " · 삭제된 서비스"}
                  </span>
                  <h3 className="mt-1 text-17 font-bold">
                    {opening === note.id ? "불러오는 중…" : note.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-14 whitespace-pre-line text-text-2">
                    {note.excerpt}
                  </p>
                  <span className="mt-3 block text-12 text-muted">
                    {new Date(note.updatedAt).toLocaleDateString("ko-KR")} 수정
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {data.total > data.size && (
            <nav
              className="mt-6 flex justify-center gap-4"
              aria-label="회고 페이지"
            >
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                이전
              </Button>
              <span className="self-center text-13 text-muted">
                {page + 1} / {Math.ceil(data.total / data.size)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={(page + 1) * data.size >= data.total}
                onClick={() => setPage(page + 1)}
              >
                다음
              </Button>
            </nav>
          )}
        </>
      )}
      {editor && (
        <ReflectionModal
          key={editor === "new" ? "new" : editor.id}
          api={api}
          note={editor === "new" ? null : editor}
          services={services.map(({ id, name }) => ({ id, name }))}
          onClose={() => setEditor(null)}
          onDone={() => {
            setEditor(null);
            setPage(0);
            setRefresh((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}

export function ReflectionModal({
  api,
  note,
  services,
  onClose,
  onDone,
}: {
  api: ReflectionApi;
  note: ReflectionEntry | null;
  services: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const heading = useId();
  const [editing, setEditing] = useState(!note);
  const [serviceId, setService] = useState(
    note?.serviceId ?? (note ? "" : (services[0]?.id ?? "")),
  );
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<"discard" | "delete" | null>(null);
  const dirty =
    editing &&
    (title !== (note?.title ?? "") ||
      body !== (note?.body ?? "") ||
      serviceId !== (note?.serviceId ?? (note ? "" : (services[0]?.id ?? ""))));
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  const close = () => {
    if (confirm) setConfirm(null);
    else if (dirty) setConfirm("discard");
    else onClose();
  };
  const save = async () => {
    if (busy || !title.trim() || !body.trim() || (!note && !serviceId)) return;
    setBusy(true);
    setError("");
    try {
      await api.save(
        note,
        { serviceId: serviceId || null, title, body },
        services.find((s) => s.id === serviceId)?.name ??
          note?.serviceName ??
          "",
      );
      onDone();
    } catch (error) {
      setError(toApiError(error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal width={760} labelledBy={heading} onClose={close} locked={busy}>
      <h3 id={heading}>
        {confirm === "discard"
          ? "변경 내용을 저장하지 않고 닫을까요?"
          : confirm === "delete"
            ? "이 회고를 삭제할까요?"
            : editing
              ? note
                ? "회고 수정"
                : "회고 쓰기"
              : note?.title}
      </h3>
      {confirm ? (
        <>
          <p>
            {confirm === "discard"
              ? "저장하지 않은 변경 내용은 사라져요."
              : "삭제한 회고는 복구할 수 없어요."}
          </p>
          {error && (
            <p className="mt-3 text-wine!" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              취소
            </Button>
            <Button
              variant={confirm === "delete" ? "danger" : "primary"}
              disabled={busy}
              onClick={async () => {
                if (confirm === "discard") {
                  onClose();
                  return;
                }
                if (!note) return;
                setBusy(true);
                setError("");
                try {
                  await api.remove(note);
                  onDone();
                } catch (error) {
                  setError(toApiError(error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy
                ? "처리 중…"
                : confirm === "discard"
                  ? "저장하지 않고 닫기"
                  : "삭제"}
            </Button>
          </div>
        </>
      ) : editing ? (
        <div className="mt-5 flex flex-col gap-5" aria-busy={busy}>
          <p className="text-13! text-muted!">
            선택한 서비스에 연결되며 나에게만 표시돼요.
          </p>
          <label className={`${labelClass} flex-col! items-stretch!`}>
            서비스
            <select
              className={selectClass}
              value={serviceId}
              disabled={busy}
              onChange={(e) => setService(e.target.value)}
            >
              <option value="" disabled={!!services.length}>
                {note?.serviceId == null && note
                  ? `${note.serviceName} (삭제된 서비스)`
                  : "서비스 선택"}
              </option>
              {note?.serviceId &&
                !services.some((s) => s.id === note.serviceId) && (
                  <option value={note.serviceId}>
                    {note.serviceName} (이전 서비스)
                  </option>
                )}
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label className={`${labelClass} flex-col! items-stretch!`}>
            제목
            <input
              className={inputClass}
              maxLength={100}
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="이번에 배우고 느낀 점은 무엇인가요?"
            />
          </label>
          <MarkdownEditor value={body} disabled={busy} onChange={setBody} />
          {error && (
            <p className="text-wine!" role="alert">
              저장하지 못했어요. {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={busy} onClick={close}>
              취소
            </Button>
            <Button
              disabled={
                busy || !title.trim() || !body.trim() || (!note && !serviceId)
              }
              onClick={() => {
                void save();
              }}
            >
              {busy ? "저장 중…" : "회고 저장"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-13! text-muted!">
            {note?.serviceName}
            {note?.serviceId == null && " · 삭제된 서비스"} · 나만 보기
          </p>
          <div className="mt-6">
            <MarkdownContent>{note?.body ?? ""}</MarkdownContent>
          </div>
          <div className="mt-6 flex justify-between gap-2">
            <Button variant="text" onClick={() => setConfirm("delete")}>
              삭제
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                닫기
              </Button>
              <Button onClick={() => setEditing(true)}>수정</Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
