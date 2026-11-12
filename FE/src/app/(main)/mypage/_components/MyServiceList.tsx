"use client";

import { useState } from "react";
import type { Service } from "@/api/types";
import { ServiceCard } from "@/components/service/ServiceCard";
import { ServiceList } from "@/components/service/ServiceList";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FILTER_DEFAULT_ALL, applyFilter } from "@/domain/filter";
import {
  MINE_SORT_OPTIONS,
  SAVED_SORT_OPTIONS,
  sortMine,
  sortSaved,
  type MySort,
} from "@/domain/sort";
import { inListTransition } from "@/lib/listTransition";
import { ListToolbar } from "../../_components/ListToolbar";
import { useListState } from "../../_components/useListState";
import {
  HiddenServiceCard,
  HiddenServiceRow,
  SavedHiddenCard,
  SavedHiddenRow,
} from "./HiddenServiceItems";

/**
 * 마이페이지의 내 서비스·저장한 서비스 목록. 홈·최신과 같은 필터 줄에 정렬을 더한다.
 * 내 서비스는 등록일·인기(전체 점수) 기준, 저장한 서비스는 담은 순서 기준이다.
 * 저장한 서비스의 `items` 는 담은 순서(먼저 담은 것이 앞)로 받는다.
 */
export function MyServiceList({
  kind,
  items,
}: {
  kind: "mine" | "saved";
  items: Service[];
}) {
  const st = useListState(null, { shared: false, base: FILTER_DEFAULT_ALL });
  const [sort, setSort] = useState<MySort>("new");
  const mine = kind === "mine";
  const filtered = applyFilter(items, st.f, false);
  const shown = mine
    ? sortMine(filtered, sort)
    : sortSaved(filtered, sort === "old" ? "old" : "new");
  return (
    <>
      <ListToolbar
        st={st}
        count={shown.length}
        mobileSwitch={false}
        divider={false}
        showCount={false}
        sort={
          <SegmentedControl<MySort>
            label="정렬"
            value={sort}
            onChange={(v) => inListTransition(() => setSort(v))}
            options={mine ? MINE_SORT_OPTIONS : SAVED_SORT_OPTIONS}
            toggle={!mine}
          />
        }
      />
      {shown.length ? (
        <ServiceList
          items={shown}
          view={st.view}
          renderItem={(s) =>
            s.pub === "public" ? (
              <ServiceCard s={s} heading="h2" />
            ) : mine ? (
              <HiddenServiceCard s={s} />
            ) : (
              <SavedHiddenCard s={s} />
            )
          }
          renderRow={(s) =>
            s.pub === "public" ? null : mine ? (
              <HiddenServiceRow s={s} />
            ) : (
              <SavedHiddenRow s={s} />
            )
          }
        />
      ) : (
        <EmptyState
          title="조건에 맞는 서비스가 없어요"
          desc="필터를 줄이거나 초기화해 보세요."
          action="필터 초기화"
          onAction={() => st.setF({ ...FILTER_DEFAULT_ALL })}
          icon="filter"
        />
      )}
    </>
  );
}
