"use client";

import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import { RouteLink } from "@/components/ui/RouteLink";
import { cx } from "@/lib/cx";
import { routeNameOf, type RouteName } from "@/lib/routes";

const NAV: [RouteName, string][] = [
  ["home", "홈"],
  ["trending", "트렌딩"],
  ["popular", "인기"],
  ["latest", "최신"],
];

/** 홈·트렌딩·인기·최신 탭. 현재 화면을 강조한다 */
export function MainNav() {
  const cur = routeNameOf(usePathname());
  return (
    <div className="page-wrap">
      <nav
        className="flex h-nav w-fit items-center border-b border-border @max-[560px]/app:h-[46px]"
        aria-label="메인 메뉴"
      >
        {NAV.map(([id, label]) => {
          const active = cur === id;
          return (
            <RouteLink
              key={id}
              to={id}
              aria-current={active ? "page" : undefined}
              className={cx(
                "relative flex h-nav w-[92px] flex-col items-center justify-center text-[17px] hover:text-ink @max-[560px]/app:h-[46px] @max-[560px]/app:w-[74px] @max-[560px]/app:text-15",
                active ? "font-bold text-ink" : "font-semibold text-muted",
              )}
            >
              {label}
              {active && (
                <ViewTransition name="main-nav-underline" share="nav-underline">
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" />
                </ViewTransition>
              )}
            </RouteLink>
          );
        })}
      </nav>
    </div>
  );
}
