"use client";

import { useEffect, useState } from "react";
import type { AiSearchResult } from "@/api/types";
import { Footer } from "@/components/layout/Footer";
import { SearchBar } from "@/components/layout/SearchBar";
import { SectionHead } from "@/components/layout/SectionHead";
import { ServiceList } from "@/components/service/ServiceList";
import { ServiceListSkeleton } from "@/components/service/ServiceListSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { helpClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/Icon";
import { Note } from "@/components/ui/Note";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { applyFilter } from "@/domain/filter";
import { POLICY } from "@/domain/policy";
import { isNatural, keywordSearch } from "@/domain/search";
import { scoreOf } from "@/domain/score";
import { useWt } from "@/providers/context";
import { ListHead } from "../../_components/ListHead";
import { ListToolbar } from "../../_components/ListToolbar";
import { SearchExamples } from "../../_components/SearchExamples";
import { useListState, type ListState } from "../../_components/useListState";

type Sort = "rel" | "pop" | "new";
type Ai = AiSearchResult & { left: number };

/** 검색 화면. 검색어(`q`)는 주소의 쿼리에서 받는다 */
export function SearchScreen({ q }: { q: string }) {
  const wt = useWt();
  const st = useListState(null);
  const [sort, setSort] = useState<Sort>("rel");
  return (
    <>
      <div className="page-wrap pt-6">
        <div className="max-w-[760px]">
          <SearchBar initial={q} size="sm" autoFocus={!q} />
        </div>
        {!q && (
          <div className="mt-5">
            <p className={`${helpClass} mb-2.5`}>
              키워드나 문장으로 찾아보세요. 문장으로 입력하면 AI가 의도를 분석해
              찾아요.
            </p>
            <SearchExamples align="start" />
          </div>
        )}
        {q && (
          // 검색어(또는 회원 여부)가 바뀌면 처음부터 다시 검색한다
          <SearchResults
            key={`${q}|${wt.me ? "member" : "guest"}`}
            q={q}
            st={st}
            sort={sort}
            setSort={setSort}
          />
        )}
      </div>
      <Footer />
    </>
  );
}

function SearchResults({
  q,
  st,
  sort,
  setSort,
}: {
  q: string;
  st: ListState;
  sort: Sort;
  setSort: (s: Sort) => void;
}) {
  const wt = useWt();
  const natural = isNatural(q);
  const limit = wt.me ? POLICY.aiLimitMember : POLICY.aiLimitGuest;
  // 같은 검색어 + 같은 상태 → 같은 결과. 검색을 시작할 때의 AI 사용 횟수로 한도를 판정한다
  const [usedAtStart] = useState(wt.aiUsed);
  const exhausted = natural && usedAtStart >= limit;
  // 검색 로딩 스켈레톤 — 고정 지연이라 같은 조건에 같은 결과
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), natural ? 900 : 450);
    return () => clearTimeout(t);
  }, [natural]);
  // 검색어가 바뀔 때만 AI 횟수를 1회 차감한다(목업). 이 컴포넌트는 검색어마다 새로 만들어진다
  const [ai, setAi] = useState<Ai | null>(null);
  useEffect(() => {
    if (!natural || exhausted) return;
    let alive = true;
    wt.aiSearch(q).then((r) => {
      if (!alive) return;
      wt.recordAiUse();
      setAi({ ...r, left: limit - usedAtStart - 1 });
    });
    return () => {
      alive = false;
    };
    // 검색 시작 시점의 값으로 한 번만 실행한다(AI 횟수는 이 안에서 올라간다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mode = !natural ? "kw" : exhausted ? "exhausted" : ai ? "ai" : null;
  let items: ReturnType<typeof keywordSearch>[number]["s"][] = [];
  let reasons: Record<string, string> | null = null;
  const pool = applyFilter(
    wt.publicServices,
    st.f,
    wt.isMobile && st.mobileOnly,
  );
  if (mode === "ai" && ai) {
    items = ai.picks
      .map(([id]) => pool.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s);
    reasons = Object.fromEntries(ai.picks);
    if (sort !== "rel")
      items = [...items].sort((a, b) =>
        sort === "pop"
          ? scoreOf(b, "all") - scoreOf(a, "all")
          : b.created.localeCompare(a.created),
      );
  } else if (mode) {
    let hits = keywordSearch(pool, q);
    if (mode === "exhausted" && !hits.length)
      hits = keywordSearch(
        pool,
        q
          .split(/\s+/)
          .filter((w) => w.length >= 2)
          .join(" "),
      );
    hits.sort((a, b) =>
      sort === "rel"
        ? b.score - a.score
        : sort === "pop"
          ? scoreOf(b.s, "all") - scoreOf(a.s, "all")
          : b.s.created.localeCompare(a.s.created),
    );
    items = hits.map((h) => h.s);
  }
  const popular = [...wt.publicServices]
    .filter((s) => s.use === "live")
    .sort((a, b) => scoreOf(b, "m") - scoreOf(a, "m"))
    .slice(0, 4);

  if (loading)
    return (
      <div className="pt-7" aria-busy="true">
        <div className={`${helpClass} mb-4 flex items-center gap-1.5`}>
          <Icon name={natural ? "spark" : "search"} size={14} />
          {natural ? "AI가 문장의 의도를 분석하고 있어요…" : "검색하고 있어요…"}
        </div>
        <ServiceListSkeleton view={st.view} />
      </div>
    );
  if (!mode) return null;
  return (
    <>
      <ListHead title={<>“{q}” 검색 결과</>} variant="result" />
      {mode === "ai" && ai && (
        <div
          className="mb-6 flex flex-col gap-2.5 rounded-md border border-border bg-card px-[18px] py-4"
          data-component="ai-result"
        >
          <div className="flex flex-wrap items-center gap-2 text-14 font-bold text-navy">
            <Icon name="spark" size={16} />
            AI가 의도를 분석해 찾은 서비스
            <span className="ml-auto text-12 font-medium text-muted">
              오늘 남은 AI 검색 {ai.left}/{limit}회 — 비회원{" "}
              {POLICY.aiLimitGuest}회, 회원 {POLICY.aiLimitMember}회
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="해석한 조건">
            {ai.chips.map((c) => (
              <span
                key={c}
                className="inline-flex h-[26px] items-center rounded-pill bg-navy-50 px-2.5 text-12 font-semibold text-navy"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
      {mode === "exhausted" && (
        <Note tone="butter" className="mb-5">
          <Icon name="info" size={16} />
          오늘 AI 검색 {limit}회를 모두 사용해서 일반 검색 결과를 보여 드려요.
          내일 다시 이용할 수 있어요.
          {!wt.me && (
            <> 로그인하면 하루 {POLICY.aiLimitMember}회까지 쓸 수 있어요.</>
          )}
        </Note>
      )}
      {items.length > 0 ? (
        <>
          <ListToolbar
            st={st}
            count={items.length}
            right={
              <SegmentedControl
                label="정렬"
                value={sort}
                onChange={setSort}
                options={[
                  ["rel", "관련도"],
                  ["pop", "인기"],
                  ["new", "최신"],
                ]}
              />
            }
          />
          <ServiceList items={items} view={st.view} reasons={reasons} />
        </>
      ) : (
        <>
          <EmptyState
            title="검색 결과가 없어요"
            desc="다른 단어로 검색하거나, 아래 인기 서비스를 둘러보세요."
            icon="search"
          />
          <section className="mt-4">
            <SectionHead title="이번 달 인기 서비스" />
            <ServiceList items={popular} />
          </section>
        </>
      )}
    </>
  );
}
