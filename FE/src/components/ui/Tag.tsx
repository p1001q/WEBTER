"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** 작은 알약 태그. `onRemove` 가 있으면 해제 버튼이 붙는다 */
export function Tag({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-pill bg-light px-2.5 text-12 font-medium whitespace-nowrap text-text-2">
      {children}
      {onRemove && (
        <button
          type="button"
          className="inline-grid p-0 font-normal text-muted"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </span>
  );
}
