"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/Switch";
import { Chip } from "@/components/ui/Chip";
import { ViewToggle } from "@/components/service/ViewToggle";
import { filterCount } from "@/domain/filter";
import { CATEGORIES } from "@/domain/options";
import { cx } from "@/lib/cx";
import { useWt } from "@/providers/context";
import { FilterPanel } from "./FilterPanel";
import type { ListState } from "./useListState";

/** 필터 버튼·결과 수·서비스 용도 칩·보기 전환과 필터 패널 */
export function ListToolbar({
  st,
  count,
  right,
  sort,
  mobileSwitch = true,
  divider = true,
  showCount = true,
}: {
  st: ListState;
  count: number;
  right?: ReactNode;
  /** 필터 버튼 왼쪽에 두는 정렬 선택 */
  sort?: ReactNode;
  /** 모바일에서 「모바일 지원 서비스만 보기」 스위치를 보일지(내 서비스·저장한 서비스는 끈다) */
  mobileSwitch?: boolean;
  /** 아래 구분선(기본 있음) */
  divider?: boolean;
  /** 필터 버튼 옆 결과 개수(기본 보임) */
  showCount?: boolean;
}) {
  const wt = useWt();
  const fc = filterCount(st.f, st.base);
  return (
    <>
      {wt.isMobile && mobileSwitch && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3.5 py-2.5">
          <Switch
            on={st.mobileOnly}
            onChange={st.setMobileOnly}
            label="모바일 지원 서비스만 보기"
          />
        </div>
      )}
      <div
        className={cx(
          "mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-3 py-3 @max-[1100px]/app:grid-cols-[1fr_auto]",
          divider && "border-b border-border",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 @max-[560px]/app:order-1">
          {sort}
          <Button
            size="sm"
            variant={st.open ? "ink" : "ghost"}
            aria-expanded={st.open}
            onClick={() => st.setOpen(!st.open)}
          >
            <Icon name="filter" size={15} />
            필터{fc > 0 && <span className="font-mono">{fc}</span>}
          </Button>
          {showCount && (
            <span className="text-14 text-muted">
              <b className="font-bold text-ink">{count}</b>개
            </span>
          )}
        </div>
        <div
          className="flex flex-wrap justify-center gap-1.5 @max-[1100px]/app:order-last @max-[1100px]/app:col-span-2 @max-[560px]/app:flex-nowrap @max-[560px]/app:justify-start @max-[560px]/app:overflow-x-auto @max-[560px]/app:[scrollbar-width:none]"
          role="group"
          aria-label="서비스 용도"
        >
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              size="sm"
              on={st.f.cats.includes(c.id)}
              onClick={() =>
                st.setF((prev) => ({
                  ...prev,
                  cats: prev.cats.includes(c.id)
                    ? prev.cats.filter((x) => x !== c.id)
                    : [...prev.cats, c.id],
                }))
              }
            >
              {c.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 @max-[560px]/app:contents">
          {right && (
            <div className="@max-[560px]/app:order-3 @max-[560px]/app:col-span-2">
              {right}
            </div>
          )}
          <div className="@max-[560px]/app:order-2 @max-[560px]/app:justify-self-end">
            <ViewToggle value={st.view} onChange={st.setView} />
          </div>
        </div>
      </div>
      <div
        className={cx(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          st.open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        inert={!st.open}
      >
        <div className="min-h-0 overflow-hidden">
          <FilterPanel f={st.f} setF={st.setF} base={st.base} />
        </div>
      </div>
    </>
  );
}
