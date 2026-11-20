"use client";

import { useEffect, useState } from "react";
import { reflectionApi } from "@/api/real/reflectionApi";
import { toApiError } from "@/api/errors";
import { Button } from "@/components/ui/Button";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";
import { inputClass, labelClass, selectClass } from "@/components/ui/field";

export function ReflectionWritePanel({
  userId,
  services,
  onSaved,
}: {
  userId: string;
  services: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [api] = useState(() => reflectionApi(userId));
  const [serviceId, setService] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = !!title || !!body;
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  return (
    <div className="max-w-[1100px] py-6" aria-label="회고 작성">
      <p className="mb-6 text-13 text-muted">
        서비스를 만들며 배운 점과 다음 계획을 남겨보세요. 지금은 나만 볼 수
        있어요.
      </p>
      <div className="flex flex-col gap-5" aria-busy={busy}>
        <label
          className={`${labelClass} max-w-[440px] flex-col! items-stretch!`}
        >
          서비스 선택
          <select
            className={selectClass}
            value={serviceId}
            disabled={busy}
            onChange={(event) => setService(event.target.value)}
          >
            <option value="">어떤 서비스에 대한 회고인가요?</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </label>
        {!services.length && (
          <p className="text-13 text-muted">
            내가 등록한 서비스가 있어야 회고를 저장할 수 있어요.
          </p>
        )}
        <label className={`${labelClass} flex-col! items-stretch!`}>
          제목
          <input
            className={inputClass}
            maxLength={100}
            value={title}
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="이번에 배우고 느낀 점은 무엇인가요?"
          />
        </label>
        <MarkdownEditor value={body} onChange={setBody} disabled={busy} />
        {error && (
          <p role="alert" className="text-13 text-wine">
            저장하지 못했어요. {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button
            disabled={busy || !serviceId || !title.trim() || !body.trim()}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              setError("");
              try {
                await api.save(
                  null,
                  { serviceId, title, body },
                  services.find((service) => service.id === serviceId)?.name ??
                    "",
                );
                onSaved();
              } catch (error) {
                setError(toApiError(error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "저장 중…" : "회고 저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}
