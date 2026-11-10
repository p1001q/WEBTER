"use client";

import type { Notification } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fmtDate } from "@/domain/format";
import { notificationTarget, notificationText } from "@/domain/notification";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";

const INVITE_RESULT = { ACCEPTED: "수락함", DECLINED: "거절함" } as const;

/** 알림 한 건. 누르면 읽음으로 바뀌고 해당 화면으로 이동한다. 대기 중인 팀 초대는 수락·거절 버튼을 보인다 */
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
  const service = wt.svc(n.sid)?.name ?? n.serviceName ?? "삭제된 서비스";
  // 익명·비회원이 남긴 글은 작성자를 알리지 않는다
  const actorName =
    actor?.nick ?? (n.kind.startsWith("invite") ? "알 수 없음" : "익명");
  const pending = n.kind === "invite" && n.invite?.status === "PENDING";
  const result =
    n.kind === "invite" && n.invite && n.invite.status !== "PENDING"
      ? INVITE_RESULT[n.invite.status]
      : null;
  const open = () => {
    wt.readNotification(n.id);
    onOpen?.();
    const t = notificationTarget(n);
    wt.go(t.to, t.params);
  };
  const frame = cx(
    "flex w-full items-start gap-3 text-left",
    compact ? "rounded-[6px] px-3 py-2.5" : "px-5 py-4",
    !n.read && !compact && "bg-[#fbf8ef]",
  );
  const avatar = actor ? (
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
  );
  const body = (
    <span className="min-w-0 flex-1">
      <span
        className={cx(
          "block text-14 leading-[1.5]",
          compact && "line-clamp-2",
          n.read ? "text-text-2" : "font-semibold text-ink",
        )}
      >
        {notificationText(n, actorName, service)}
      </span>
      {n.quote && !compact && (
        <span className="mt-0.5 block truncate text-13 text-muted">
          “{n.quote}”
        </span>
      )}
      {pending && (
        <span className="mt-2 flex gap-2">
          <Button
            size="sm"
            onClick={() => wt.respondInvite(n.id, true)}
            aria-label={`${service} 팀원 초대 수락`}
          >
            수락
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => wt.respondInvite(n.id, false)}
            aria-label={`${service} 팀원 초대 거절`}
          >
            거절
          </Button>
        </span>
      )}
      <span className="mt-0.5 block text-12 text-muted">
        {result && <b className="mr-1.5 font-semibold">{result}</b>}
        {fmtDate(n.date)}
      </span>
    </span>
  );
  const dot = !n.read && (
    <span
      className="mt-2 size-2 shrink-0 rounded-full bg-wine"
      aria-label="읽지 않음"
    />
  );
  // 수락·거절 버튼이 있는 줄은 버튼 안에 버튼을 넣을 수 없으므로 줄 전체를 누르는 동작을 두지 않는다
  if (pending)
    return (
      <div className={frame}>
        {avatar}
        {body}
        {dot}
      </div>
    );
  return (
    <button
      type="button"
      onClick={open}
      className={cx(frame, "transition-colors hover:bg-light")}
    >
      {avatar}
      {body}
      {dot}
    </button>
  );
}
