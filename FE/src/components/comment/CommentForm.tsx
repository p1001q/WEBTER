"use client";

import { useId, useState } from "react";
import type { Comment, CommentInput, Service } from "@/api/types";
import { Button } from "@/components/ui/Button";
import {
  checkClass,
  counterClass,
  fieldClass,
  textareaClass,
} from "@/components/ui/field";
import { COMMENT_MAX } from "@/domain/comment";
import { useWt } from "@/providers/context";

interface Props {
  s: Service;
  initial?: Comment | null;
  label: string;
  placeholder?: string;
  submitLabel?: string;
  minHeight?: number;
  onSubmit: (v: CommentInput) => void | Promise<void>;
  onCancel?: () => void;
}

/* 댓글·답글 작성 폼 (상세 인라인, 답글, 수정 모달 공용) */
export function CommentForm({
  s,
  initial,
  label,
  placeholder = "서비스에 대한 이야기를 남겨 주세요.",
  submitLabel = "댓글 남기기",
  minHeight = 80,
  onSubmit,
  onCancel,
}: Props) {
  const wt = useWt();
  const id = useId();
  const [text, setText] = useState(initial?.text ?? "");
  const [anon, setAnon] = useState(initial?.a.kind === "anon");
  const [busy, setBusy] = useState(false);
  const canAnon = s.allowAnonComment && wt.me?.id !== s.owner;
  const ok = text.trim().length > 0 && !busy;
  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({ text: text.trim(), anon: canAnon && anon });
      if (!initial) {
        setText("");
        setAnon(false);
      }
    } catch {
      wt.toast("댓글을 저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.", {
        err: true,
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2.5">
      <div className={fieldClass}>
        <label className="sr-only" htmlFor={id}>
          {label}
        </label>
        <textarea
          id={id}
          className={textareaClass}
          style={{ minHeight }}
          maxLength={COMMENT_MAX}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
        />
        <span className={`${counterClass} self-end`}>
          {text.length}/{COMMENT_MAX}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canAnon ? (
          <label className={checkClass}>
            <input
              type="checkbox"
              checked={anon}
              onChange={(e) => setAnon(e.target.checked)}
            />
            익명으로 남기기
          </label>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              취소
            </Button>
          )}
          <Button size="sm" disabled={!ok} onClick={submit}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
