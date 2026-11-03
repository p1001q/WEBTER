"use client";

import { useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { NotificationRow } from "@/components/notification/NotificationRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { boxClass } from "@/components/ui/box";
import { useWt } from "@/providers/context";

type Filter = "all" | "unread";

/** 알림 화면: 전체·읽지 않음, 모두 읽음, 모두 삭제 */
export function NotificationsScreen() {
  const wt = useWt();
  const [filter, setFilter] = useState<Filter>("all");
  const sorted = [...wt.notifications].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const unreadCount = sorted.filter((n) => !n.read).length;
  const list = filter === "unread" ? sorted.filter((n) => !n.read) : sorted;
  const text =
    "inline-flex h-8 items-center px-2 text-13 text-muted hover:text-ink disabled:cursor-default disabled:opacity-40 disabled:hover:text-muted";
  return (
    <>
      <div className="page-wrap">
        <div className="mx-auto max-w-[820px] pt-10 pb-16">
          <h1 className="m-0 text-28 font-extrabold tracking-[-0.02em]">
            알림
          </h1>
          <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl<Filter>
              label="알림 보기"
              value={filter}
              onChange={setFilter}
              options={[
                ["all", "전체"],
                ["unread", `읽지 않음 ${unreadCount}`],
              ]}
            />
            <div className="flex items-center">
              <button
                type="button"
                className={text}
                disabled={unreadCount === 0}
                onClick={() => wt.readAllNotifications()}
              >
                모두 읽음
              </button>
              <button
                type="button"
                className={text}
                disabled={sorted.length === 0}
                onClick={() => wt.clearNotifications()}
              >
                모두 삭제
              </button>
            </div>
          </div>
          {list.length ? (
            <ul className={`${boxClass} m-0 list-none overflow-hidden p-0`}>
              {list.map((n) => (
                <li
                  key={n.id}
                  className="group/row relative border-b border-light last:border-b-0"
                >
                  <NotificationRow n={n} />
                  <button
                    type="button"
                    aria-label="이 알림 삭제"
                    className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:bg-light hover:text-ink focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100"
                    onClick={() => wt.deleteNotification(n.id)}
                  >
                    <Icon name="close" size={15} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className={boxClass}>
              <EmptyState
                title={
                  filter === "unread"
                    ? "읽지 않은 알림이 없어요"
                    : "아직 알림이 없어요"
                }
                desc="내 서비스에 리뷰나 댓글이 달리면 여기에 알려 드려요."
                icon="info"
              />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
