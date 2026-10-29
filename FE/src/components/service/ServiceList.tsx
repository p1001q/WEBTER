import type { CSSProperties } from "react";
import type { Service } from "@/api/types";
import { DISPLAY } from "@/domain/policy";
import { ServiceCard } from "./ServiceCard";
import styles from "./ServiceList.module.css";
import { ServiceRow } from "./ServiceRow";
import { rowsClass } from "./rowStyles";

interface ServiceListProps {
  items: Service[];
  view?: "card" | "list";
  rankStart?: number;
  reasons?: Record<string, string> | null;
  /** 카드형 열 수(기본 4) */
  cols?: number;
  /** 좁은 화면에서도 2열을 유지 */
  m2?: boolean;
}

/** 서비스 목록. 카드형(격자)과 목록형(행) */
export function ServiceList({
  items,
  view = "card",
  rankStart,
  reasons,
  cols,
  m2,
}: ServiceListProps) {
  const rank = (i: number) => (rankStart != null ? rankStart + i : undefined);
  if (view === "list")
    return (
      <div className={rowsClass}>
        {items.map((s, i) => (
          <ServiceRow
            key={s.id}
            s={s}
            rank={rank(i)}
            reason={reasons?.[s.id]}
          />
        ))}
      </div>
    );
  return (
    <div
      className={m2 ? `${styles.grid} ${styles.m2}` : styles.grid}
      style={{ "--cols": cols || DISPLAY.defaultCols } as CSSProperties}
    >
      {items.map((s, i) => (
        <ServiceCard key={s.id} s={s} rank={rank(i)} reason={reasons?.[s.id]} />
      ))}
    </div>
  );
}
