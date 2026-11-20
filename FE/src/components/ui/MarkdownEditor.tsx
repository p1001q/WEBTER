"use client";

import { useId, useRef, useState } from "react";
import { MarkdownContent } from "./MarkdownContent";
import { SegmentedControl } from "./SegmentedControl";
import { labelClass, textareaClass } from "./field";

const formats = [
  ["제목", "## ", ""],
  ["굵게", "**", "**"],
  ["기울임", "_", "_"],
  ["코드", "`", "`"],
  ["코드 블록", "\n```\n", "\n```\n"],
  ["목록", "- ", ""],
  ["인용", "> ", ""],
  ["링크", "[", "](https://)"],
] as const;

export function MarkdownEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className={labelClass} htmlFor={id}>
          회고 내용
        </label>
        <SegmentedControl
          label="마크다운 보기"
          value={mode}
          onChange={setMode}
          options={[
            ["edit", "편집"],
            ["preview", "미리보기"],
          ]}
        />
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div
          className="flex flex-wrap gap-1 border-b border-border bg-light/50 p-2"
          role="toolbar"
          aria-label="마크다운 서식"
        >
          {formats.map(([label, prefix, suffix]) => (
            <button
              key={label}
              type="button"
              disabled={disabled || mode !== "edit"}
              className="rounded-sm px-2 py-1 text-12 font-semibold text-muted hover:bg-light hover:text-ink disabled:opacity-35"
              onClick={() => {
                const el = textarea.current;
                if (!el) return;
                const start = el.selectionStart,
                  end = el.selectionEnd;
                const selected = value.slice(start, end) || "내용";
                const next =
                  value.slice(0, start) +
                  prefix +
                  selected +
                  suffix +
                  value.slice(end);
                if (next.length > 10000) return;
                onChange(next);
                requestAnimationFrame(() => {
                  el.focus();
                  el.setSelectionRange(
                    start + prefix.length,
                    start + prefix.length + selected.length,
                  );
                });
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "edit" ? (
          <textarea
            id={id}
            ref={textarea}
            className={`${textareaClass} min-h-[360px] rounded-none! border-0! font-mono text-14!`}
            maxLength={10000}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={
              "## 잘된 점\n\n- 이번에 배운 내용을 적어보세요.\n\n## 아쉬운 점\n\n## 다음에 시도할 일"
            }
          />
        ) : (
          <div
            className="min-h-[360px] overflow-x-auto p-5"
            aria-label="회고 미리보기"
          >
            {value.trim() ? (
              <MarkdownContent>{value}</MarkdownContent>
            ) : (
              <p className="text-14 text-muted">
                내용을 입력하면 마크다운 미리보기가 표시돼요.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between gap-2 text-12 text-muted">
        <span>마크다운 지원 · 제목, 목록, 표, 체크리스트, 코드 블록</span>
        <span>{value.length.toLocaleString()} / 10,000</span>
      </div>
    </div>
  );
}
