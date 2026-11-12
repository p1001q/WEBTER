"use client";

import type { Service } from "@/api/types";
import { ServiceIcon } from "@/components/service/ServiceIcon";
import { ServiceThumb } from "@/components/service/ServiceThumb";
import { StatusBadge } from "@/components/service/StatusBadge";
import {
  rowClass,
  rowDescClass,
  rowMainClass,
  rowSideClass,
  rowTitleClass,
} from "@/components/service/rowStyles";
import { Icon } from "@/components/ui/Icon";
import { MiniButton } from "@/components/ui/MiniButton";
import { helpClass } from "@/components/ui/field";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";

type HiddenKind = "private" | "temp";

/** 비공개·임시 비공개 서비스는 본인에게만 이유와 함께 흐리게 보여 준다 */
export function HiddenServiceCard({ s }: { s: Service }) {
  return (
    <article
      className="relative flex min-w-0 flex-col overflow-hidden rounded-sm bg-card shadow-card transition-shadow duration-200 hover:shadow-hover"
      data-private={s.pub}
    >
      <div className="relative block opacity-55">
        <ServiceThumb s={s} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-4 pb-3.5">
        <div className="flex min-w-0 items-center gap-2 text-12 text-muted">
          <StatusBadge kind={s.pub as HiddenKind} />
        </div>
        <h2 className="m-0 truncate text-16 leading-[1.35] font-bold tracking-[-0.01em]">
          {s.name}
        </h2>
        <p
          className={cx(
            "m-0 flex items-start gap-1.5 text-[12.5px] leading-[1.45]",
            s.pub === "temp" ? "text-butter-ink" : "text-wine",
          )}
        >
          <Icon name="info" size={14} className="mt-px" />
          {s.pubReason}
        </p>
      </div>
      <div className="flex min-h-11 items-center gap-1 border-t border-light px-4 py-2.5 text-[12.5px]">
        <span className={helpClass}>일반 사용자에게 보이지 않아요</span>
      </div>
    </article>
  );
}

/** 목록형의 비공개·임시 비공개 서비스 행 */
export function HiddenServiceRow({ s }: { s: Service }) {
  return (
    <div className={rowClass} data-private={s.pub}>
      <div className="opacity-55">
        <ServiceIcon s={s} size={48} />
      </div>
      <div className={rowMainClass}>
        <div className={rowTitleClass}>
          <span className="truncate">{s.name}</span>
          <StatusBadge kind={s.pub as HiddenKind} />
        </div>
        <div
          className={cx(
            rowDescClass,
            s.pub === "temp" ? "text-butter-ink" : "text-wine",
          )}
        >
          {s.pubReason}
        </div>
      </div>
      <div className={cx(rowSideClass, "@max-[560px]/app:hidden")}>
        <span className={helpClass}>일반 사용자에게 보이지 않아요</span>
      </div>
    </div>
  );
}

/** 저장했지만 비공개로 바뀐 서비스: 이름과 저장 해제만 보여 준다(이미지·사유는 가린다) */
export function SavedHiddenCard({ s }: { s: Service }) {
  const wt = useWt();
  return (
    <article
      className="relative flex min-w-0 flex-col overflow-hidden rounded-sm bg-card shadow-card"
      data-saved-hidden={s.id}
    >
      <div className="aspect-[16/10] bg-light" />
      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-4 pb-3.5">
        <div className="flex min-w-0 items-center gap-2 text-12 text-muted">
          <StatusBadge kind={s.pub as HiddenKind} />
        </div>
        <h2 className="m-0 truncate text-16 leading-[1.35] font-bold tracking-[-0.01em] text-muted">
          {s.name}
        </h2>
        <p className="m-0 flex items-start gap-1.5 text-[12.5px] leading-[1.45] text-muted">
          <Icon name="info" size={14} className="mt-px" />
          지금은 볼 수 없는 서비스예요
        </p>
      </div>
      <div className="flex min-h-11 items-center gap-1 border-t border-light px-4 py-2.5 text-[12.5px]">
        <MiniButton onClick={() => wt.toggleSave(s.id)}>
          <Icon name="bookmark" size={13} />
          저장 해제
        </MiniButton>
      </div>
    </article>
  );
}

/** 목록형의 저장했지만 비공개로 바뀐 서비스 행(이미지·사유는 가린다) */
export function SavedHiddenRow({ s }: { s: Service }) {
  const wt = useWt();
  return (
    <div className={rowClass} data-saved-hidden={s.id}>
      <div className="size-12 shrink-0 rounded-sm bg-light" />
      <div className={rowMainClass}>
        <div className={cx(rowTitleClass, "text-muted")}>
          <span className="truncate">{s.name}</span>
          <StatusBadge kind={s.pub as HiddenKind} />
        </div>
        <div className={rowDescClass}>지금은 볼 수 없는 서비스예요</div>
      </div>
      <div className={rowSideClass}>
        <MiniButton onClick={() => wt.toggleSave(s.id)}>
          <Icon name="bookmark" size={13} />
          저장 해제
        </MiniButton>
      </div>
    </div>
  );
}
