import { STATE_LABEL } from "@/domain/options";

const TONE = {
  live: "bg-status-live-bg text-status-live-fg",
  stop: "bg-status-stop-bg text-status-stop-fg",
  private: "bg-status-private-bg text-status-private-fg",
  temp: "bg-status-temp-bg text-status-temp-fg",
};

/** 서비스 상태 배지(사용 가능·사용 불가능·비공개·임시 비공개) */
export function StatusBadge({ kind }: { kind: keyof typeof TONE }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-[5px] rounded-sm px-2 text-[11.5px] font-bold tracking-[-0.01em] whitespace-nowrap ${TONE[kind]}`}
    >
      <span className="inline-block size-1.5 rounded-full bg-current" />
      {STATE_LABEL[kind]}
    </span>
  );
}
