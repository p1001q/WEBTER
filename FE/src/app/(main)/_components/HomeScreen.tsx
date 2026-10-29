"use client";

import type { Service } from "@/api/types";
import { Footer } from "@/components/layout/Footer";
import { MainNav } from "@/components/layout/MainNav";
import { SearchBar } from "@/components/layout/SearchBar";
import { SectionHead } from "@/components/layout/SectionHead";
import { ServiceList } from "@/components/service/ServiceList";
import { Icon } from "@/components/ui/Icon";
import { RouteLink } from "@/components/ui/RouteLink";
import { CAT } from "@/domain/options";
import { DISPLAY, POLICY } from "@/domain/policy";
import { scoreOf } from "@/domain/score";
import type { RouteName } from "@/lib/routes";
import { useWt } from "@/providers/context";
import { SearchExamples } from "./SearchExamples";

interface Section {
  title: string;
  sub: string;
  to: RouteName;
  items: Service[];
  rank?: boolean;
}

/** 홈: 검색, 관심 카테고리 안내, 트렌딩·인기·최신 미리보기 */
export function HomeScreen() {
  const wt = useWt();
  const live = wt.publicServices.filter((s) => s.use === "live");
  const interests = wt.me?.interests ?? [];
  const prio = (list: Service[]) =>
    interests.length
      ? [...list].sort(
          (a, b) =>
            (b.cats.some((c) => interests.includes(c)) ? 1 : 0) -
            (a.cats.some((c) => interests.includes(c)) ? 1 : 0),
        )
      : list;
  const n = DISPLAY.homeCount;
  const sections: Record<(typeof DISPLAY.homeSections)[number], Section> = {
    trending: {
      title: "지금 뜨는 서비스",
      sub: `최근 ${POLICY.trendingDays}일 동안 반응이 빠르게 늘고 있어요`,
      to: "trending",
      items: prio(
        [...live].sort((a, b) => scoreOf(b, "d3") - scoreOf(a, "d3")),
      ).slice(0, n),
      rank: !interests.length,
    },
    popular: {
      title: "이번 달 인기 서비스",
      sub: "이번 달 가장 많은 반응을 받았어요",
      to: "popular",
      items: prio(
        [...live].sort((a, b) => scoreOf(b, "m") - scoreOf(a, "m")),
      ).slice(0, n),
      rank: !interests.length,
    },
    latest: {
      title: "새로 등록된 서비스",
      sub: "방금 올라온 서비스",
      to: "latest",
      items: [...live]
        .sort((a, b) => b.created.localeCompare(a.created))
        .slice(0, n),
    },
  };
  return (
    <>
      <MainNav />
      <div className="page-wrap">
        <section className="pt-14 pb-2 text-center @max-[560px]/app:pt-8 @max-[560px]/app:pb-0 @max-[560px]/app:text-left">
          <h1 className="m-0 text-40 leading-[1.2] font-extrabold tracking-[-0.035em] text-balance @max-[860px]/app:text-[32px] @max-[560px]/app:text-[25px]">
            오늘은 어떤 웹에서 놀아 볼까요?
          </h1>
          <p className="mt-3 text-16 text-pretty text-muted @max-[560px]/app:text-14">
            설치 없이, 링크 하나로. 개발자들이 직접 만든 웹 서비스를 찾아보세요.
          </p>
          <div className="mx-auto mt-7 max-w-[720px]">
            <SearchBar />
            <SearchExamples />
          </div>
          {interests.length > 0 && (
            <div className="mt-6 flex items-center justify-center gap-2 text-13 text-text-3 @max-[560px]/app:flex-wrap @max-[560px]/app:justify-start">
              <Icon name="spark" size={14} />
              관심 카테고리:{" "}
              <b className="font-bold text-ink">
                {interests.map((c) => CAT[c].label).join(", ")}
              </b>{" "}
              — 트렌딩·인기에서 먼저 보여 드려요
              <RouteLink
                to="mypage"
                params={{ tab: "settings" }}
                className="font-bold text-navy underline underline-offset-[3px]"
              >
                변경
              </RouteLink>
            </div>
          )}
        </section>
        {DISPLAY.homeSections.map((k) => {
          const sec = sections[k];
          return (
            <section className="mt-14 @max-[560px]/app:mt-10" key={k}>
              <SectionHead
                title={sec.title}
                sub={sec.sub}
                onMore={() => wt.go(sec.to)}
              />
              <ServiceList
                items={sec.items}
                rankStart={sec.rank ? 1 : undefined}
              />
            </section>
          );
        })}
      </div>
      <Footer />
    </>
  );
}
