"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Chip, chipClass } from "@/components/ui/Chip";
import {
  FILTER_DEFAULT,
  type FilterKey,
  type FilterState,
} from "@/domain/filter";
import { CATEGORIES, OPT, TYPE_SHORT } from "@/domain/options";

const rowClass =
  "grid grid-cols-[96px_1fr] items-center gap-3 @max-[860px]/app:grid-cols-1 @max-[860px]/app:gap-1.5";
const keyClass = "text-13 font-bold text-text-3";
const valuesClass = "flex flex-wrap gap-1.5";

/** 필터 패널. 같은 항목 안에서는 하나라도 맞으면, 다른 항목끼리는 모두 맞아야 한다 */
export function FilterPanel({
  f,
  setF,
}: {
  f: FilterState;
  setF: (f: FilterState) => void;
}) {
  const P = useId();
  const tog = (k: FilterKey, v: string) =>
    setF({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v],
    });
  const row = (
    k: FilterKey,
    label: string,
    opts: readonly (readonly [string, string])[],
  ) => (
    <div className={rowClass} key={k}>
      <span className={keyClass} id={P + "flt-" + k}>
        {label}
      </span>
      <div
        className={valuesClass}
        role="group"
        aria-labelledby={P + "flt-" + k}
      >
        {opts.map(([v, l]) => (
          <Chip
            key={v}
            size="sm"
            on={f[k].includes(v)}
            onClick={() => tog(k, v)}
          >
            {l}
          </Chip>
        ))}
      </div>
    </div>
  );
  return (
    <div
      className="mb-6 flex flex-col gap-3 rounded-md border border-border bg-card px-6 py-4"
      data-component="filter-panel"
    >
      {row(
        "cats",
        "서비스 용도",
        CATEGORIES.map((c) => [c.id, c.label] as const),
      )}
      {row(
        "type",
        "프로젝트 유형",
        OPT.type.map(([v]) => [v, TYPE_SHORT[v]] as const),
      )}
      {row("devices", "기기 지원", OPT.devices)}
      {row("price", "가격", OPT.price)}
      {row("owner", "등록 주체", OPT.owner)}
      <div className={rowClass}>
        <span className={keyClass}>이용 형태</span>
        <div className={valuesClass}>
          <span
            className={chipClass({ on: true, size: "sm" })}
            aria-disabled="true"
          >
            웹 서비스
          </span>
        </div>
      </div>
      {row("langs", "지원 언어", OPT.langs)}
      {row("use", "사용 상태", OPT.use)}
      <div className="flex items-center gap-3 border-t border-light pt-3 text-12 text-muted">
        같은 항목 안에서는 하나라도 맞으면, 다른 항목끼리는 모두 맞는 서비스를
        보여 줘요.
        <Button
          variant="text"
          size="sm"
          className="ml-auto"
          onClick={() => setF({ ...FILTER_DEFAULT })}
        >
          초기화
        </Button>
      </div>
    </div>
  );
}
