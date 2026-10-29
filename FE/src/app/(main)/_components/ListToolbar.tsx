"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/Switch";
import { Tag } from "@/components/ui/Tag";
import { ViewToggle } from "@/components/service/ViewToggle";
import { filterCount } from "@/domain/filter";
import { CAT } from "@/domain/options";
import { useWt } from "@/providers/context";
import { FilterPanel } from "./FilterPanel";
import type { ListState } from "./useListState";

/** 필터 버튼·선택한 카테고리·결과 수·보기 전환과 필터 패널 */
export function ListToolbar({
  st,
  count,
  right,
}: {
  st: ListState;
  count: number;
  right?: ReactNode;
}) {
  const wt = useWt();
  const fc = filterCount(st.f);
  return (
    <>
      {wt.isMobile && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3.5 py-2.5">
          <Switch
            on={st.mobileOnly}
            onChange={st.setMobileOnly}
            label="모바일 지원 서비스만 보기"
          />
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border py-3">
        <Button
          size="sm"
          variant={st.open ? "ink" : "ghost"}
          aria-expanded={st.open}
          onClick={() => st.setOpen(!st.open)}
        >
          <Icon name="filter" size={15} />
          필터{fc > 0 && <span className="font-mono">{fc}</span>}
        </Button>
        {st.f.cats.map((c) => {
          const label = CAT[c as keyof typeof CAT].label;
          return (
            <Tag
              key={c}
              removeLabel={`${label} 필터 해제`}
              onRemove={() =>
                st.setF({ ...st.f, cats: st.f.cats.filter((x) => x !== c) })
              }
            >
              {label}
            </Tag>
          );
        })}
        <span className="text-14 text-muted">
          <b className="font-bold text-ink">{count}</b>개
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2 @max-[560px]/app:ml-0">
          {right}
          <ViewToggle value={st.view} onChange={st.setView} />
        </div>
      </div>
      {st.open && <FilterPanel f={st.f} setF={st.setF} />}
    </>
  );
}
