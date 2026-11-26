"use client";

import { useId, type SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import {
  FILTER_DEFAULT,
  type FilterKey,
  type FilterState,
} from "@/domain/filter";
import { OPT, TYPE_SHORT } from "@/domain/options";

const rowClass =
  "grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 @max-[560px]/app:grid-cols-1 @max-[560px]/app:gap-2";
const keyClass = "text-13 font-bold text-text-3";
const valuesClass = "flex flex-wrap gap-1.5";

/** 필터 패널. 같은 항목 안에서는 하나라도 맞으면, 다른 항목끼리는 모두 맞아야 한다 */
export function FilterPanel({
  f,
  setF,
  base = FILTER_DEFAULT,
}: {
  f: FilterState;
  setF: (next: SetStateAction<FilterState>) => void;
  /** 「초기화」가 돌아갈 기본 상태 */
  base?: FilterState;
}) {
  const P = useId();
  const tog = (k: FilterKey, v: string) =>
    setF((prev) => ({
      ...prev,
      [k]: prev[k].includes(v)
        ? prev[k].filter((x) => x !== v)
        : [...prev[k], v],
    }));
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
            className="@max-[560px]/app:min-h-11"
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
      className="mb-6 grid grid-cols-2 gap-x-8 gap-y-4 rounded-md border border-border bg-card px-6 py-4 @max-[860px]/app:grid-cols-1 @max-[560px]/app:px-4"
      data-component="filter-panel"
    >
      {row(
        "type",
        "프로젝트 유형",
        OPT.type.map(([v]) => [v, TYPE_SHORT[v]] as const),
      )}
      {row("devices", "기기 지원", OPT.devices)}
      {row("price", "가격", OPT.price)}
      {row("owner", "등록 주체", OPT.owner)}
      {row("langs", "지원 언어", OPT.langs)}
      {row("use", "운영 상태", OPT.use)}
      <div className="col-span-full flex flex-wrap items-center gap-3 border-t border-light pt-3 text-13 text-muted">
        <p className="m-0 flex-[1_1_240px]">
          같은 항목 안에서는 하나라도 맞으면, 다른 항목끼리는 모두 맞는 서비스를
          보여 줘요.
        </p>
        <Button
          variant="text"
          size="sm"
          className="ml-auto @max-[560px]/app:min-h-11"
          onClick={() => setF((prev) => ({ ...base, cats: prev.cats }))}
        >
          용도 제외 초기화
        </Button>
      </div>
    </div>
  );
}
