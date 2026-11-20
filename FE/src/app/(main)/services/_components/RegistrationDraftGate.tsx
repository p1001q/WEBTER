"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import {
  registrationDraftApi,
  type RegistrationDraft,
  type RegistrationDraftApi,
} from "@/api/real/registrationDraftApi";
import { toApiError } from "@/api/errors";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useWt } from "@/providers/context";

export interface DraftSession {
  api: RegistrationDraftApi;
  initial: RegistrationDraft | null;
}

export function RegistrationDraftGate({
  userId,
  children,
}: {
  userId: string;
  children: (session: DraftSession) => ReactNode;
}) {
  const wt = useWt();
  const heading = useId();
  const [api] = useState(() => registrationDraftApi(userId));
  const [draft, setDraft] = useState<RegistrationDraft | null>();
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [discarding, setDiscarding] = useState(false);
  useEffect(() => {
    let alive = true;
    api.get().then(
      (saved) => {
        if (!alive) return;
        setDraft(saved);
        setError("");
        if (!saved) setReady(true);
      },
      (error: unknown) => {
        if (alive) setError(toApiError(error).message);
      },
    );
    return () => {
      alive = false;
    };
  }, [api, attempt]);
  if (ready) return children({ api, initial: draft ?? null });
  return (
    <div className="page-wrap py-10">
      <h1 className="mb-4 text-28 font-extrabold">서비스 등록</h1>
      {draft ? (
        <Modal
          labelledBy={heading}
          onClose={() => wt.back()}
          locked={discarding}
        >
          <h3 id={heading}>임시 저장한 내용이 있어요</h3>
          <p className="break-words">
            {draft.payload.name || "작성 중인 서비스"} — 이어서 작성할까요?
          </p>
          <p className="mt-2 text-13! text-muted!">
            새로 작성하면 이전 임시 저장 내용은 삭제돼요.
          </p>
          {error && (
            <p className="mt-3 text-wine!" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={discarding}
              onClick={async () => {
                setDiscarding(true);
                try {
                  await api.discard(draft.revision);
                  setDraft(null);
                  setReady(true);
                } catch (error) {
                  const failure = toApiError(error);
                  if (failure.code === "DRAFT_409_01") {
                    setDraft(undefined);
                    try {
                      const latest = await api.get();
                      setDraft(latest);
                      setError(
                        "다른 화면에서 초안이 변경됐어요. 최신 내용을 확인하고 다시 선택해 주세요.",
                      );
                      if (!latest) setReady(true);
                    } catch (reloadError) {
                      setError(toApiError(reloadError).message);
                    }
                  } else setError(failure.message);
                } finally {
                  setDiscarding(false);
                }
              }}
            >
              {discarding ? "처리 중…" : "새로 작성"}
            </Button>
            <Button disabled={discarding} onClick={() => setReady(true)}>
              이어서 작성
            </Button>
          </div>
        </Modal>
      ) : error ? (
        <div role="alert">
          <p className="mb-4 text-wine">
            임시 저장 내용을 확인하지 못했어요. {error}
          </p>
          <Button variant="ghost" onClick={() => setAttempt((n) => n + 1)}>
            다시 시도
          </Button>
        </div>
      ) : (
        <p role="status" className="text-muted">
          임시 저장 내용을 확인하고 있어요…
        </p>
      )}
    </div>
  );
}
