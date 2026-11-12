"use client";

import { Button } from "./Button";
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
        <Button variant="ghost" className="mt-3" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}
