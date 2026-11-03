"use client";

import type { Notification } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { fmtDate } from "@/domain/format";
import { notificationTarget, notificationText } from "@/domain/notification";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";

/** 알림 한 건. 누르면 읽음으로 바뀌고 해당 화면으로 이동한다 */
export function NotificationRow({
  n,
  onOpen,
  compact,
}: {
  n: Notification;
  /** 이동하기 직전에 부르는 함수(메뉴 닫기 등) */
  onOpen?: () => void;
  compact?: boolean;
}) {
  const wt = useWt();
  const actor = n.actor ? wt.users[n.actor] : undefined;
  const service = wt.svc(n.sid)?.name ?? "삭제된 서비스";
  const open = () => {
    wt.readNotification(n.id);
    onOpen?.();
    const t = notificationTarget(n);
    wt.go(t.to, t.params);
  };
  return (
    <button
      type="button"
      onClick={open}
      className={cx(
        "flex w-full items-start gap-3 text-left transition-colors hover:bg-light",
        compact ? "rounded-[6px] px-3 py-2.5" : "px-5 py-4",
        !n.read && !compact && "bg-[#fbf8ef]",
      )}
    >
      {actor ? (
        <Avatar user={actor} size={compact ? 32 : 40} />
      ) : (
        <span
          className={cx(
            "grid shrink-0 place-items-center rounded-full bg-wine-50 text-wine",
            compact ? "size-8" : "size-10",
          )}
        >
          <Icon name="alert" size={compact ? 16 : 20} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cx(
            "block text-14 leading-[1.5]",
            compact && "line-clamp-2",
            n.read ? "text-text-2" : "font-semibold text-ink",
          )}
        >
          {notificationText(n, actor?.nick ?? "알 수 없음", service)}
        </span>
        {n.quote && !compact && (
          <span className="mt-0.5 block truncate text-13 text-muted">
            “{n.quote}”
          </span>
        )}
        <span className="mt-0.5 block text-12 text-muted">
          {fmtDate(n.date)}
        </span>
      </span>
      {!n.read && (
        <span
          className="mt-2 size-2 shrink-0 rounded-full bg-wine"
          aria-label="읽지 않음"
        />
      )}
    </button>
  );
}
