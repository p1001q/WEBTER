"use client";

import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  title: string;
  desc: string;
  action?: string;
  onAction?: () => void;
  icon?: IconName;
}

export function EmptyState({
  title,
  desc,
  action,
  onAction,
  icon = "search",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-5 py-16 text-center text-muted">
      <span className="mb-2 grid size-[52px] place-items-center rounded-full bg-light">
        <Icon name={icon} size={22} />
      </span>
      <b className="text-[17px] text-ink">{title}</b>
      <span>{desc}</span>
      {action && (
        // 공통 Button 컴포넌트를 만들기 전까지 보관본의 ghost 버튼 스타일을 그대로 쓴다.
        <button
          type="button"
          className="mt-3 inline-flex h-ctl-md items-center justify-center gap-1.5 rounded-pill border border-border bg-card px-4 text-14 font-semibold whitespace-nowrap text-ink transition-colors hover:bg-light active:scale-[.98]"
          onClick={onAction}
        >
          {action}
        </button>
      )}
    </div>
  );
}
