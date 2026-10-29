"use client";

import { useState, type ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { MainNav } from "@/components/layout/MainNav";
import { ServiceList } from "@/components/service/ServiceList";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FILTER_DEFAULT, applyFilter } from "@/domain/filter";
import { CAT } from "@/domain/options";
import { POLICY } from "@/domain/policy";
import { scoreOf } from "@/domain/score";
import { useWt } from "@/providers/context";
import { ListHead } from "./ListHead";
import { ListToolbar } from "./ListToolbar";
import { useListState } from "./useListState";

type Period = "w" | "m" | "all";

/** 트렌딩·인기·최신이 같이 쓰는 목록 화면. `cat`·`period` 는 주소의 쿼리에서 받는다 */
export function RankedListScreen({
  kind,
  cat,
  period: periodParam,
}: {
  kind: "trending" | "popular" | "latest";
  cat?: string;
  period?: Period;
}) {
  const wt = useWt();
  const st = useListState(cat ?? null);
  const [chosen, setChosen] = useState<Period>(
    periodParam ?? POLICY.popularDefault,
  );
  const list = applyFilter(
    wt.publicServices,
    st.f,
    wt.isMobile && st.mobileOnly,
  );
  let items,
    title: string,
    desc: string,
    right: ReactNode = null,
    ranked = true;
  if (kind === "trending") {
    items = [...list].sort((a, b) => scoreOf(b, "d3") - scoreOf(a, "d3"));
    title = "트렌딩";
    desc = `최근 ${POLICY.trendingDays}일 동안 반응(이용하기·좋아요·저장)이 많이 늘어난 순서예요.`;
  } else if (kind === "popular") {
    items = [...list].sort((a, b) => scoreOf(b, chosen) - scoreOf(a, chosen));
    title = "인기";
    desc = "선택한 기간 동안 받은 반응(이용하기·좋아요·저장)이 많은 순서예요.";
    right = (
      <SegmentedControl
        label="인기 기간"
        value={chosen}
        onChange={setChosen}
        options={[
          ["w", "주간"],
          ["m", "월간"],
          ["all", "전체"],
        ]}
      />
    );
  } else {
    items = [...list].sort((a, b) => b.created.localeCompare(a.created));
    title =
      st.f.cats.length === 1
        ? `최신 · ${CAT[st.f.cats[0] as keyof typeof CAT].label}`
        : "최신";
    desc = "최근에 등록된 순서예요.";
    ranked = false;
  }
  return (
    <>
      <MainNav />
      <div className="page-wrap">
        <ListHead title={title} desc={desc} />
        <ListToolbar st={st} count={items.length} right={right} />
        {items.length ? (
          <ServiceList
            items={items}
            view={st.view}
            rankStart={ranked ? 1 : undefined}
          />
        ) : (
          <EmptyState
            title="조건에 맞는 서비스가 없어요"
            desc="필터를 줄이거나 초기화해 보세요."
            action="필터 초기화"
            onAction={() => st.setF({ ...FILTER_DEFAULT })}
            icon="filter"
          />
        )}
      </div>
      <Footer />
    </>
  );
}
