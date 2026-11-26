"use client";

import { useState, type ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { MainNav } from "@/components/layout/MainNav";
import { NoServices } from "@/components/service/NoServices";
import { ServiceList } from "@/components/service/ServiceList";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FILTER_DEFAULT, applyFilter } from "@/domain/filter";
import { POLICY } from "@/domain/policy";
import { scoreOf } from "@/domain/score";
import { inListTransition } from "@/lib/listTransition";
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
    desc = `최근 ${POLICY.trendingDays}일 동안 반응(이용하기·추천·저장)이 많이 늘어난 순서예요.`;
  } else if (kind === "popular") {
    items = [...list].sort((a, b) => scoreOf(b, chosen) - scoreOf(a, chosen));
    title = "인기";
    desc = "선택한 기간 동안 받은 반응(이용하기·추천·저장)이 많은 순서예요.";
    right = (
      <SegmentedControl
        className="@max-[560px]/app:[&_button]:min-h-11"
        label="인기 기간"
        value={chosen}
        onChange={(p) => inListTransition(() => setChosen(p))}
        options={[
          ["w", "주간"],
          ["m", "월간"],
          ["all", "전체"],
        ]}
      />
    );
  } else {
    items = [...list].sort((a, b) => b.created.localeCompare(a.created));
    title = "최신";
    desc = "최근에 등록된 순서예요.";
    ranked = false;
  }
  // 관심 카테고리는 우선 정렬에만 사용한다. 탐색 용도 선택은 항상 전체 또는 한 개다.
  const interests = wt.me?.interests ?? [];
  if (kind !== "latest" && st.f.cats.length === 0 && interests.length) {
    items.sort(
      (a, b) =>
        Number(b.cats.some((c) => interests.includes(c))) -
        Number(a.cats.some((c) => interests.includes(c))),
    );
  }
  return (
    <>
      <MainNav />
      <div className="page-wrap">
        <ListHead
          title={title}
          desc={desc}
          titleAction={
            right && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-13 font-semibold text-muted">
                  집계 기간
                </span>
                {right}
              </div>
            )
          }
        />
        <ListToolbar st={st} count={items.length} sidebarCategories />
        {items.length ? (
          <ServiceList
            items={items}
            view={st.view}
            rankStart={ranked ? 1 : undefined}
            heading="h2"
          />
        ) : wt.publicServices.length === 0 ? (
          <NoServices />
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
