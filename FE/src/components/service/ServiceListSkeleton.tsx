import type { CSSProperties } from "react";
import { DISPLAY } from "@/domain/policy";
import styles from "./ServiceList.module.css";

import { shimmer as shimmerBase } from "@/components/ui/Skeleton";

const shimmer = `${shimmerBase} rounded-sm`;

/** 서비스 목록을 불러오는 동안 보여 주는 자리 표시(카드형 4개·목록형 3개) */
export function ServiceListSkeleton({ view }: { view: "card" | "list" }) {
  if (view === "list")
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${shimmer} h-[76px]`} />
        ))}
      </div>
    );
  return (
    <div
      data-component="service-list"
      className={styles.grid}
      style={{ "--cols": DISPLAY.defaultCols } as CSSProperties}
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`${shimmer} aspect-[16/15]`} />
      ))}
    </div>
  );
}
