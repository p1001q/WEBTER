"use client";

import { useState, type ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { MainNav } from "@/components/layout/MainNav";
import { NoServices } from "@/components/service/NoServices";
import { ServiceList } from "@/components/service/ServiceList";
import { ServiceListSkeleton } from "@/components/service/ServiceListSkeleton";
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
type Kind = "trending" | "popular" | "latest";

/** 화면마다 고정된 제목·설명. 로딩 중에도 자리 표시 없이 그대로 보여 준다 */
const COPY: Record<Kind, { title: string; desc: string }> = {
  trending: {
    title: "트렌딩",
    desc: `최근 ${POLICY.trendingDays}일 동안 반응(이용하기·추천·저장)이 많이 늘어난 순서예요.`,
  },
  popular: {
    title: "인기",
    desc: "선택한 기간 동안 받은 반응(이용하기·추천·저장)이 많은 순서예요.",
  },
  latest: { title: "최신", desc: "최근에 등록된 순서예요." },
};

function PeriodControl({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <span className="text-13 font-semibold text-muted">집계 기간</span>
      <SegmentedControl
        className="@max-[560px]/app:[&_button]:min-h-11"
        label="인기 기간"
        value={value}
        onChange={onChange}
        options={[
          ["w", "주간"],
          ["m", "월간"],
          ["all", "전체"],
        ]}
      />
    </div>
  );
}

/**
 * 화면을 옮기는 동안(loading) 보여 주는 목록 화면. 제목·설명·기간·필터·보기 버튼은 실제로 그리고
 * 서비스 목록 자리만 스켈레톤으로 둔다.
 */
export function RankedListLoading({ kind }: { kind: Kind }) {
  const st = useListState(null);
  return (
    <>
      <MainNav />
      <div className="page-wrap">
        <ListHead
          title={COPY[kind].title}
          desc={COPY[kind].desc}
          titleAction={
            kind === "popular" ? (
              <PeriodControl
                value={POLICY.popularDefault}
                onChange={() => {}}
              />
            ) : undefined
          }
        />
        <ListToolbar st={st} count={0} showCount={false} sidebarCategories />
        <div role="status" aria-label="서비스 목록을 불러오는 중">
          <ServiceListSkeleton view={st.view} />
        </div>
      </div>
    </>
  );
}

/** 트렌딩·인기·최신이 같이 쓰는 목록 화면. `cat`·`period` 는 주소의 쿼리에서 받는다 */
export function RankedListScreen({
  kind,
  cat,
  period: periodParam,
}: {
  kind: Kind;
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
  const { title, desc } = COPY[kind];
  let items,
    right: ReactNode = null,
    ranked = true;
  if (kind === "trending") {
    items = [...list].sort((a, b) => scoreOf(b, "d3") - scoreOf(a, "d3"));
  } else if (kind === "popular") {
    items = [...list].sort((a, b) => scoreOf(b, chosen) - scoreOf(a, chosen));
    right = (
      <PeriodControl
        value={chosen}
        onChange={(p) => inListTransition(() => setChosen(p))}
      />
    );
  } else {
    items = [...list].sort((a, b) => b.created.localeCompare(a.created));
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
        <ListHead title={title} desc={desc} titleAction={right ?? undefined} />
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
