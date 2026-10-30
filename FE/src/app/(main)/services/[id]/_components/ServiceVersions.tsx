import type { Service } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { helpClass } from "@/components/ui/field";
import { fmtDate } from "@/domain/format";

/** 상세 하단의 접이식 버전 기록 */
export function ServiceVersions({ s }: { s: Service }) {
  return (
    <details className="mt-12 border-t border-border" data-component="versions">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-4 text-14 font-bold [&::-webkit-details-marker]:hidden">
        <Icon name="history" size={16} />
        버전 기록{" "}
        <small className="text-[83.3333%] font-medium text-muted">
          {s.versions.length
            ? `${s.versions[0].ver} · ${fmtDate(s.versions[0].date)}`
            : "기록 없음"}
        </small>
        <Icon name="chevDown" size={16} className="ml-auto" />
      </summary>
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
    </details>
  );
}
