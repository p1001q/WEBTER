"use client";

import { CategoryGlyph } from "@/components/service/CategoryGlyph";
import { Icon } from "@/components/ui/Icon";
import { CATEGORIES } from "@/domain/options";
import { cx } from "@/lib/cx";
import { inListTransition } from "@/lib/listTransition";
import { useRoute } from "@/lib/useRoute";
import { useWt } from "@/providers/context";

const label =
  "px-3 pt-5 pb-2 text-12 font-bold text-text-3 @min-[1180px]/shell:pt-3 @min-[1180px]/shell:pb-1";
const itemBase =
  "flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-15 @min-[1180px]/shell:min-h-10";
const cnt = "ml-auto font-mono text-12 text-text-3";
const itemClass = (on: boolean) =>
  cx(
    itemBase,
    on ? "bg-card font-bold shadow-card" : "font-medium hover:bg-ink/5",
  );

/** 상시 사이드바와 좁은 화면의 메뉴가 같은 탐색·필터 상태를 사용한다. */
export function SidebarNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const wt = useWt();
  const route = useRoute();
  const onList =
    route.name === "trending" ||
    route.name === "popular" ||
    route.name === "latest";
  const picked = onList ? wt.listFilter.cats : null;
  const live = wt.publicServices.filter((s) => s.use === "live");
  const goCat = (id: string) => {
    onNavigate?.();
    inListTransition(() =>
      wt.setListFilter((prev) => ({
        ...prev,
        cats: id === "all" ? [] : [id],
      })),
    );
    if (!onList) wt.go("trending");
  };
  return (
    <nav
      aria-label="서비스 탐색"
      className="flex min-h-0 flex-1 flex-col px-4 pt-3 pb-4 @min-[1180px]/shell:py-5"
    >
      <div className={cx(label, "shrink-0")}>서비스 용도</div>
      <div
        role="group"
        aria-label="서비스 용도"
        className="@min-[1180px]/shell:min-h-0 @min-[1180px]/shell:flex-1 @min-[1180px]/shell:overflow-y-auto"
      >
        <button
          type="button"
          className={itemClass(picked?.length === 0)}
          aria-pressed={picked?.length === 0}
          onClick={() => goCat("all")}
        >
          전체<span className={cnt}>{live.length}</span>
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={itemClass(!!picked?.includes(c.id))}
            aria-pressed={!!picked?.includes(c.id)}
            onClick={() => goCat(c.id)}
          >
            <CategoryGlyph cat={c.id} size={18} />
            {c.label}
            <span className={cnt}>
              {live.filter((s) => s.cats.includes(c.id)).length}
            </span>
          </button>
        ))}
      </div>
      <div
        className={cx(
          label,
          "mt-4 shrink-0 border-t border-border @min-[1180px]/shell:mt-3",
        )}
      >
        내 메뉴
      </div>
      <button
        type="button"
        className={cx(
          "shrink-0",
          itemClass(route.name === "mypage" && route.query.tab === "saved"),
        )}
        onClick={() => {
          onNavigate?.();
          wt.requireLogin(
            () => wt.go("mypage", { tab: "saved" }),
            "저장한 서비스는 로그인 후 볼 수 있어요.",
          );
        }}
      >
        <Icon name="bookmark" size={18} />
        저장한 서비스
        <span className={cnt}>
          {wt.me ? wt.saves.size : <Icon name="lock" size={13} />}
        </span>
      </button>
      <button
        type="button"
        className={cx("shrink-0", itemClass(route.name === "manage"))}
        onClick={() => {
          onNavigate?.();
          wt.requireLogin(
            () => wt.go("manage"),
            "내 서비스 관리는 로그인 후 이용할 수 있어요.",
          );
        }}
      >
        <Icon name="grid" size={18} />내 서비스 관리
        {!wt.me && (
          <span className={cnt}>
            <Icon name="lock" size={13} />
          </span>
        )}
      </button>
    </nav>
  );
}
