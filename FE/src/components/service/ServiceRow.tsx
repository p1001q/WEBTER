"use client";

import { GradeBadge } from "@/components/review/GradeBadge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { RouteLink } from "@/components/ui/RouteLink";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";
import type { ServiceItemProps } from "./ServiceCard";
import { ServiceIcon } from "./ServiceIcon";
import { ServiceStats } from "./ServiceStats";
import { StatusBadge } from "./StatusBadge";

// 행에 마우스를 올리거나 포커스가 들어오면(또는 hover 지정) 나타나는 영역
const reveal =
  "group-hover/row:opacity-100 group-focus-within/row:opacity-100 group-data-[hover]/row:opacity-100";

/** 목록형 서비스 항목 */
export function ServiceRow({ s, rank, reason, hover }: ServiceItemProps) {
  const wt = useWt();
  const agg = wt.agg(s);
  const down = s.use === "stop";
  return (
    <div
      className="group/row relative flex min-w-0 items-center gap-4 border-t border-light px-6 py-3.5 transition-colors duration-150 first:border-t-0 hover:bg-[#fbfaf7] data-[hover]:bg-[#fbfaf7] @max-[560px]/app:gap-3 @max-[560px]/app:px-3.5 @max-[560px]/app:py-3"
      data-hover={hover ? "" : undefined}
      data-sid={s.id}
    >
      <RouteLink
        to="detail"
        params={{ id: s.id }}
        className="flex min-w-0 flex-1 items-center gap-4 text-inherit"
      >
        {rank != null && (
          <span
            className={cx(
              "w-7 shrink-0 text-center font-mono text-14 font-bold",
              rank <= 3 ? "text-ink" : "text-muted",
            )}
          >
            {rank}
          </span>
        )}
        <ServiceIcon s={s} size={48} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2 text-15 font-bold">
            <span className="truncate">{s.name}</span>
            {down && <StatusBadge kind="stop" />}
          </div>
          <div className="truncate text-13 text-text-2">
            {reason ? (
              <>
                <b className="text-navy">추천 이유</b> · {reason}
              </>
            ) : (
              s.tagline
            )}
          </div>
        </div>
      </RouteLink>
      <div className="flex shrink-0 items-center gap-3">
        <div
          className={cx(
            "flex items-center gap-3 opacity-0 transition-opacity duration-150 @max-[560px]/app:opacity-100 [@media(hover:none)]:opacity-100",
            reveal,
          )}
        >
          <GradeBadge grade={agg.grade} count={agg.total} />
          <Button
            variant="ink"
            size="sm"
            className="@max-[560px]/app:hidden [@media(hover:none)]:hidden"
            disabled={down}
            aria-label={`${s.name} 이용하기 (새 탭)`}
            onClick={() => wt.launch(s)}
          >
            이용하기 <Icon name="external" size={13} stroke={2} />
          </Button>
        </div>
        <ServiceStats
          s={s}
          liked={wt.likes.has(s.id)}
          saved={wt.saves.has(s.id)}
          className="@max-[560px]/app:hidden"
        />
      </div>
    </div>
  );
}
