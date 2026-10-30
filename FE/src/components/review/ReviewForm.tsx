"use client";

import { useId, useState } from "react";
import type {
  Rate,
  Review,
  ReviewInput,
  ReviewRole,
  Service,
} from "@/api/types";
import { Button } from "@/components/ui/Button";
import {
  checkClass,
  counterClass,
  fieldClass,
  helpClass,
  labelClass,
  textareaClass,
} from "@/components/ui/field";
import { FieldMessage } from "@/components/ui/FieldMessage";
import { Icon, type IconName } from "@/components/ui/Icon";
import { hasLink } from "@/domain/review";
import { cx } from "@/lib/cx";

interface Props {
  s: Service;
  role: ReviewRole;
  initial?: Review | null;
  onSubmit: (v: ReviewInput & { anon: boolean }) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

const RATES: [Rate, string, IconName, string][] = [
  ["up", "추천", "thumbUp", "border-navy bg-navy-50 text-navy"],
  ["down", "비추천", "thumbDown", "border-wine bg-wine-50 text-wine"],
  ["none", "미설정", "minus", "border-ink bg-light"],
];
const MAX = 500;
const row = "flex flex-wrap items-center gap-3";

/* 리뷰 작성 폼 (상세 인라인 + 수정 모달 공용) */
export function ReviewForm({
  s,
  role,
  initial,
  onSubmit,
  onCancel,
  submitLabel = "리뷰 남기기",
}: Props) {
  const id = useId();
  const [rate, setRate] = useState<Rate | null>(
    initial ? initial.rate || "none" : role === "guest" ? "none" : null,
  );
  const [text, setText] = useState(initial ? initial.text : "");
  const [anon, setAnon] = useState(initial ? initial.a.kind === "anon" : false);
  const link = hasLink(text);
  const stopLock = s.use === "stop";
  const needRate = role === "member" && !rate;
  const ok = text.trim().length >= 2 && !link && !needRate;
  const rateDisabled = (r: Rate) =>
    role === "guest" ? r !== "none" : stopLock && r !== "none";
  // 방향키로 평가를 옮긴다(비활성 항목은 건너뜀). 탭 순서에는 선택된(없으면 첫 활성) 버튼만 둔다
  const firstEnabled = RATES.find(([r]) => !rateDisabled(r))?.[0];
  const moveRate = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    from: number,
  ) => {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    e.preventDefault();
    for (let n = 1; n <= RATES.length; n++) {
      const to = (from + step * n + RATES.length * n) % RATES.length;
      if (rateDisabled(RATES[to][0])) continue;
      setRate(RATES[to][0]);
      (e.currentTarget.parentElement?.children[to] as HTMLElement).focus();
      return;
    }
  };
  return (
    <div className="flex flex-col gap-3">
      {role !== "maker" ? (
        <div className={row}>
          <span className={labelClass} id={id + "r"}>
            평가
          </span>
          <div
            className="inline-flex gap-1.5"
            role="radiogroup"
            aria-labelledby={id + "r"}
          >
            {RATES.map(([r, label, icon, on], idx) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={rate === r}
                tabIndex={(rate ?? firstEnabled) === r ? 0 : -1}
                onKeyDown={(e) => moveRate(e, idx)}
                className={cx(
                  "inline-flex h-9 items-center gap-1.5 rounded-pill border px-3.5 text-13 font-semibold disabled:cursor-not-allowed disabled:opacity-40",
                  rate === r ? on : "border-border bg-card",
                )}
                disabled={rateDisabled(r)}
                onClick={() => setRate(r)}
              >
                <Icon name={icon} size={15} />
                {label}
              </button>
            ))}
          </div>
          {role === "guest" && (
            <span className={helpClass}>
              비회원 리뷰는 평가 없이(미설정) 남겨져요.
            </span>
          )}
          {role === "member" && stopLock && (
            <span className={helpClass}>
              사용할 수 없는 서비스라 지금은 미설정으로만 남길 수 있어요.
            </span>
          )}
        </div>
      ) : (
        <FieldMessage state="idle">
          제작자 리뷰에는 평가가 없고, 평가 집계와 인기 점수에서 제외돼요.
        </FieldMessage>
      )}
      <div className={fieldClass}>
        <label className="sr-only" htmlFor={id}>
          리뷰 내용
        </label>
        <textarea
          id={id}
          className={cx(textareaClass, link && "border-wine!")}
          maxLength={MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="서비스를 이용해 본 경험을 남겨 주세요."
          style={{ minHeight: 96 }}
        />
        <div className="flex items-center gap-2">
          {link ? (
            <FieldMessage state="err">
              리뷰에는 링크를 넣을 수 없어요. 주소를 지워 주세요.
            </FieldMessage>
          ) : (
            <span className={helpClass}>링크는 넣을 수 없어요.</span>
          )}
          <span className={counterClass}>
            {text.length}/{MAX}
          </span>
        </div>
      </div>
      <div className={`${row} justify-between`}>
        {role === "member" && s.allowAnon ? (
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
            <Button variant="ghost" onClick={onCancel}>
              취소
            </Button>
          )}
          <Button
            disabled={!ok}
            onClick={() =>
              onSubmit({
                rate: role === "maker" ? null : rate,
                text: text.trim(),
                anon,
              })
            }
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
