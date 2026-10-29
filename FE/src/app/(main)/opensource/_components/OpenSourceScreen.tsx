"use client";

import { useState } from "react";
import { Footer } from "@/components/layout/Footer";
import {
  rowClass,
  rowDescClass,
  rowLinkClass,
  rowMainClass,
  rowRankClass,
  rowSideClass,
  rowTitleClass,
  rowsClass,
} from "@/components/service/rowStyles";
import { ServiceIcon } from "@/components/service/ServiceIcon";
import { ServiceStats } from "@/components/service/ServiceStats";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Note } from "@/components/ui/Note";
import { ScopeBadge } from "@/components/ui/ScopeBadge";
import { Tabs } from "@/components/ui/Tabs";
import { CAT } from "@/domain/options";
import { osScoreAll } from "@/domain/score";
import { useWt } from "@/providers/context";
import { ListHead } from "../../_components/ListHead";

type Tab = "trending" | "popular" | "latest";

/** 오픈소스(확장 시연): 이용하기 집계 없이 좋아요·저장으로만 순위를 매긴다 */
export function OpenSourceScreen({ tab: tabParam }: { tab?: Tab }) {
  const wt = useWt();
  const [tab, setTab] = useState<Tab>(tabParam ?? "trending");
  const items = [...wt.opensource].sort((a, b) =>
    tab === "trending"
      ? b.sc[0] - a.sc[0]
      : tab === "popular"
        ? osScoreAll(b) - osScoreAll(a)
        : b.created.localeCompare(a.created),
  );
  return (
    <>
      <div className="page-wrap">
        <ListHead
          title={
            <>
              <Icon name="code" size={26} />
              오픈소스 <ScopeBadge />
            </>
          }
          desc="GitHub로 소스를 공개한 프로젝트를 모아 둔 부가 영역이에요."
        />
        <Note className="mb-4">
          <Icon name="info" size={16} />
          오픈소스는 이용하기 집계 없이 좋아요·저장으로만 순위를 매기며, 웹
          서비스와 따로 집계해요.
        </Note>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            ["trending", "트렌딩"],
            ["popular", "인기"],
            ["latest", "최신"],
          ]}
        />
        <div className={`mt-5 ${rowsClass}`}>
          {items.map((o, i) => (
            <div className={rowClass} key={o.id}>
              <div className={`${rowLinkClass} cursor-default`}>
                {tab !== "latest" && (
                  <span className={rowRankClass(i < 3)}>{i + 1}</span>
                )}
                <ServiceIcon s={{ ...o, hasIcon: true }} size={48} />
                <div className={rowMainClass}>
                  <div className={rowTitleClass}>
                    <span className="truncate font-mono text-15">{o.name}</span>
                  </div>
                  <div className={rowDescClass}>{o.tagline}</div>
                </div>
              </div>
              <div className={rowSideClass}>
                <span className="text-[12.5px] text-muted @max-[560px]/app:hidden">
                  {o.cats.map((c) => CAT[c].label).join(" · ")}
                </span>
                <ServiceStats s={o} className="@max-[560px]/app:hidden" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    wt.toast(
                      `데모: ${o.github.replace("https://", "")} 로 이동하지 않아요. 실제 서비스에서는 새 탭으로 GitHub가 열려요.`,
                    )
                  }
                >
                  <Icon name="github" size={14} />
                  GitHub로 이동
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
