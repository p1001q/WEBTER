"use client";

import { usePathname } from "next/navigation";
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
        className="flex h-nav items-center gap-1 border-b border-border @max-[560px]/app:h-[46px] @max-[560px]/app:gap-0"
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
                "relative flex h-nav flex-col justify-center px-3.5 text-[17px] hover:text-ink @max-[560px]/app:h-[46px] @max-[560px]/app:px-2.5 @max-[560px]/app:text-15",
                active ? "font-bold text-ink" : "font-semibold text-muted",
              )}
            >
              {label}
              {active && (
                <span className="absolute inset-x-3.5 -bottom-px h-0.5 rounded-[2px] bg-ink @max-[560px]/app:inset-x-2.5" />
              )}
            </RouteLink>
          );
        })}
      </nav>
    </div>
  );
}
