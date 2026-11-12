"use client";

import { useState } from "react";
import type { Service } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { helpClass } from "@/components/ui/field";
import { fmtDate } from "@/domain/format";
import { cx } from "@/lib/cx";

/** 상세 하단의 접이식 버전 기록. 열고 닫을 때 높이가 부드럽게 바뀐다 */
export function ServiceVersions({ s }: { s: Service }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-12 border-t border-border" data-component="versions">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 py-4 text-left text-14 font-bold"
        aria-expanded={open}
        aria-controls="version-list"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="history" size={16} />
        버전 기록{" "}
        <small className="text-[83.3333%] font-medium text-muted">
          {s.versions.length
            ? `${s.versions[0].ver} · ${fmtDate(s.versions[0].date)}`
            : "기록 없음"}
        </small>
        <Icon
          name="chevDown"
          size={16}
          className={cx(
            "ml-auto transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id="version-list"
        className={cx(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          {s.versions.length ? (
            s.versions.map((v) => (
              <div
                className="grid grid-cols-[96px_1fr_auto] gap-4 border-t border-light py-3 text-13 text-text-2 @max-[560px]/app:grid-cols-1 @max-[560px]/app:gap-1"
                key={v.id}
              >
                <span className="font-mono">
                  {v.ver}
                  <br />
                  <span className="text-11 text-muted">{fmtDate(v.date)}</span>
                </span>
                <span>
                  <b className="block text-14 text-ink">{v.title}</b>
                  {v.body}
                </span>
                <span />
              </div>
            ))
          ) : (
            <p className={`${helpClass} pb-4`}>아직 버전 기록이 없어요.</p>
          )}
        </div>
      </div>
    </section>
  );
}
