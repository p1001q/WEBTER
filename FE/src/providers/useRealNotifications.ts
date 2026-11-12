"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { realAuth } from "@/api/auth/config";
import { notificationApi } from "@/api/real/notificationApi";
import type { Notification, User } from "@/api/types";
import type { WtStore } from "./types";

type Setter<T> = Dispatch<SetStateAction<T>>;

/** 알림은 실시간이 아니므로 열려 있는 동안 이 간격으로 새로 받는다 */
const REFRESH_MS = 60_000;

interface Props {
  viewerEpoch: RefObject<number>;
  meId: string | null;
  setUsers: Setter<Record<string, User>>;
  act: (what: string, run: () => Promise<void>) => Promise<boolean>;
  toast: WtStore["toast"];
  /** 팀원이 되면 내 서비스 목록에 그 서비스를 더한다 */
  onJoined: () => void;
}

/**
 * 실제 서버의 알림. 로그인한 동안 주기적으로 받아 오고, 읽음·삭제·초대 수락과 거절을 서버에 반영한다.
 * 목록은 화면에서 바로 바뀌도록 먼저 고치고, 실패하면 서버 상태로 다시 맞춘다.
 */
export function useRealNotifications({
  viewerEpoch,
  meId,
  setUsers,
  act,
  toast,
  onJoined,
}: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const latest = useRef(notifications);
  useEffect(() => {
    latest.current = notifications;
  }, [notifications]);

  // 조회 순서표. 더 늦게 시작한 조회나 화면에서 먼저 고친 변경이 있으면 이전 조회의 응답은 버린다
  const seq = useRef(0);
  const responding = useRef(new Set<string>());
  const refresh = useCallback(async () => {
    const epoch = viewerEpoch.current;
    const ticket = ++seq.current;
    try {
      const list = await notificationApi.list();
      // 요청하는 사이 로그아웃·다른 회원으로 바뀌었거나 더 새로운 조회·변경이 있으면 버린다
      if (epoch !== viewerEpoch.current || ticket !== seq.current) return;
      const actors = list.flatMap((m) => (m.actor ? [m.actor] : []));
      if (actors.length)
        setUsers((previous) => ({
          ...Object.fromEntries(actors.map((a) => [a.id, a])),
          ...previous,
        }));
      setNotifications(list.map((m) => m.item));
    } catch {
      // 알림을 못 받아도 화면은 그대로 둔다(다음 주기에 다시 시도한다)
    }
  }, [viewerEpoch, setUsers]);

  useEffect(() => {
    if (!realAuth) return;
    if (!meId) {
      const reset = setTimeout(() => setNotifications([]), 0);
      return () => clearTimeout(reset);
    }
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [meId, refresh]);

  const patch = (id: string, change: Partial<Notification>) => {
    seq.current++;
    setNotifications((l) =>
      l.map((n) => (n.id === id ? { ...n, ...change } : n)),
    );
  };

  const run = async (what: string, request: () => Promise<unknown>) => {
    const ok = await act(what, async () => {
      await request();
    });
    if (!ok) void refresh();
    return ok;
  };

  const reset = useCallback(() => setNotifications([]), []);

  return {
    notifications,
    reset,
    refresh,
    read: (id: string) => {
      if (latest.current.find((n) => n.id === id)?.read !== false) return;
      patch(id, { read: true });
      void run("알림을 읽음으로 바꾸지", () => notificationApi.read(id));
    },
    readAll: () => {
      seq.current++;
      setNotifications((l) => l.map((n) => ({ ...n, read: true })));
      void run("알림을 읽음으로 바꾸지", () => notificationApi.readAll());
    },
    remove: (id: string) => {
      const target = latest.current.find((n) => n.id === id);
      if (target?.invite?.status === "PENDING") {
        toast("대기 중인 초대는 수락하거나 거절한 뒤에 지울 수 있어요.", {
          err: true,
        });
        return;
      }
      seq.current++;
      setNotifications((l) => l.filter((n) => n.id !== id));
      void run("알림을 삭제하지", () => notificationApi.remove(id));
    },
    clear: async () => {
      // 대기 중인 초대 알림은 서버가 남겨 두므로 응답 뒤에 서버 목록으로 맞춘다
      if (await run("알림을 삭제하지", () => notificationApi.clear()))
        await refresh();
    },
    respond: async (id: string, accept: boolean) => {
      const invite = latest.current.find((n) => n.id === id)?.invite;
      // 이미 처리했거나 처리하는 중인 초대는 다시 보내지 않는다(버튼을 빠르게 두 번 누르는 경우)
      if (!invite || invite.status !== "PENDING" || responding.current.has(id))
        return;
      responding.current.add(id);
      let ok = false;
      try {
        ok = await run(accept ? "초대를 수락하지" : "초대를 거절하지", () =>
          accept
            ? notificationApi.accept(invite.id)
            : notificationApi.decline(invite.id),
        );
      } finally {
        responding.current.delete(id);
      }
      if (!ok) return;
      patch(id, {
        read: true,
        invite: { id: invite.id, status: accept ? "ACCEPTED" : "DECLINED" },
      });
      if (accept) {
        toast("팀원이 되었어요. 내 서비스 관리에서 확인할 수 있어요.");
        onJoined();
      } else toast("초대를 거절했어요.");
      void refresh();
    },
  };
}
