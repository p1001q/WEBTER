"use client";

import { useState, type FormEvent } from "react";
import { toApiError } from "@/api/errors";
import { Button } from "@/components/ui/Button";
import { boxClass } from "@/components/ui/box";
import {
  fieldClass,
  labelClass,
  selectClass,
  textareaClass,
} from "@/components/ui/field";

export function AdminActionForm<T extends string>({
  title,
  options,
  submit,
  onSuccess,
  children,
}: {
  title: string;
  options: { value: T; label: string }[];
  submit: (action: T, reason: string) => Promise<unknown>;
  onSuccess: () => void;
  children?: React.ReactNode;
}) {
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const action = options.find((option) => option.value === value);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!action || !reason.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await submit(action.value, reason.trim());
      setValue("");
      setReason("");
      onSuccess();
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`${boxClass} p-4`} onSubmit={handleSubmit}>
      <h2 className="mt-0 text-18 font-bold">{title}</h2>
      <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0" disabled={busy}>
        {children}
        <label className={fieldClass}>
          <span className={labelClass}>조치 선택</span>
          <select
            className={selectClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          >
            <option value="">선택해 주세요</option>
            {options.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          <span className={labelClass}>조치 사유</span>
          <textarea
            className={textareaClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            maxLength={1000}
          />
        </label>
        {error && (
          <p className="m-0 text-wine" role="alert">
            {error}
          </p>
        )}
        <div>
          <Button
            type="submit"
            variant={value === "DELETE" ? "danger" : "primary"}
            disabled={!action || !reason.trim() || busy}
          >
            {busy ? "처리 중…" : action ? `${action.label} 적용` : "조치 적용"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
