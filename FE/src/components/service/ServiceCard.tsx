"use client";

import type { Service } from "@/api/types";
import { GradeBadge } from "@/components/review/GradeBadge";
import { Icon } from "@/components/ui/Icon";
import { RouteLink } from "@/components/ui/RouteLink";
import { CAT } from "@/domain/options";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";
import { ServiceStats } from "./ServiceStats";
import { ServiceThumb } from "./ServiceThumb";
import { StatusBadge } from "./StatusBadge";

export interface ServiceItemProps {
  s: Service;
  rank?: number;
  reason?: string;
  /** 마우스를 올린 것처럼 보여준다(화면 비교용) */
  hover?: boolean;
}

// 카드에 마우스를 올리거나 포커스가 들어오면(또는 hover 지정) 나타나는 요소
const reveal =
  "group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100 group-data-[hover]/card:translate-y-0 group-data-[hover]/card:opacity-100";

/** 카드형 서비스 항목 */
export function ServiceCard({ s, rank, reason, hover }: ServiceItemProps) {
  const wt = useWt();
  const agg = wt.agg(s);
  const down = s.use === "stop";
  const c = CAT[s.cats[0]];
  return (
    <article
      className="group/card relative flex min-w-0 flex-col overflow-hidden rounded-sm bg-card shadow-card transition-[translate,box-shadow] duration-200 hover:-translate-y-1.5 hover:shadow-hover data-[hover]:shadow-hover"
      data-hover={hover ? "" : undefined}
      data-sid={s.id}
    >
      <RouteLink
        to="detail"
        params={{ id: s.id }}
        className="order-2 flex flex-1 flex-col text-inherit focus-visible:outline-offset-[-2px]"
      >
        <div className="flex flex-1 flex-col gap-1.5 px-4 pt-4 pb-3.5">
          <div className="flex min-w-0 items-center gap-2 text-12 text-muted">
            <span>
              {c.label}
              {s.cats.length > 1 && ` 외 ${s.cats.length - 1}`}
            </span>
            {down && <StatusBadge kind="stop" />}
          </div>
          <h3
            className="m-0 truncate text-16 leading-[1.35] font-bold tracking-[-0.01em]"
            title={s.name}
          >
            {s.name}
          </h3>
          <p className="m-0 line-clamp-2 min-h-[2.9em] text-[13.5px] leading-[1.45] text-text-2">
            {s.tagline}
          </p>
          {reason && (
            <div className="mt-0.5 rounded-sm bg-navy-50 px-2 py-1.5 text-12 leading-[1.4] text-navy">
              <b>추천 이유</b> · {reason}
            </div>
          )}
        </div>
      </RouteLink>
      <div className="relative order-1 block">
        <RouteLink
          to="detail"
          params={{ id: s.id }}
          tabIndex={-1}
          aria-hidden="true"
          className="block"
        >
          <ServiceThumb s={s} className={down ? "opacity-70" : undefined} />
        </RouteLink>
        <div className="pointer-events-none absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {rank != null && (
            <span
              className={cx(
                "inline-grid h-[26px] min-w-[26px] place-items-center rounded-sm px-[7px] font-mono text-12 font-bold",
                rank <= 3 ? "bg-butter text-ink" : "bg-ink text-white",
              )}
            >
              {rank}
            </span>
          )}
          <GradeBadge
            grade={agg.grade}
            count={agg.total}
            size="lg"
            className={cx(
              "-translate-y-1 opacity-0 transition-[opacity,translate] duration-[180ms] @max-[560px]/app:opacity-100 [@media(hover:none)]:opacity-100",
              reveal,
            )}
          />
        </div>
        <button
          className={cx(
            "absolute right-2.5 bottom-2.5 inline-flex h-ctl-sm translate-y-1 items-center gap-1 rounded-pill border-0 bg-launch-bg px-3 text-[12.5px] font-semibold text-white opacity-0 transition-[opacity,translate] duration-[180ms] hover:bg-navy disabled:cursor-not-allowed disabled:bg-[#8d8d8d] @max-[560px]/app:hidden [@media(hover:none)]:hidden",
            reveal,
          )}
          disabled={down}
          aria-label={`${s.name} 이용하기 (새 탭)`}
          title={down ? "지금은 이용할 수 없어요" : undefined}
          onClick={(e) => {
            e.stopPropagation();
            wt.launch(s);
          }}
        >
          이용하기 <Icon name="external" size={13} stroke={2} />
        </button>
      </div>
      <div className="order-3 flex min-h-11 items-center gap-1 border-t border-light px-4 py-2.5 text-[12.5px]">
        <ServiceStats
          s={s}
          liked={wt.likes.has(s.id)}
          saved={wt.saves.has(s.id)}
          className="ml-auto"
        />
      </div>
    </article>
  );
}
