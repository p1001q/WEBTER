"use client";

export function SectionHead({
  title,
  sub,
  onMore,
}: {
  title: string;
  sub?: string;
  onMore?: () => void;
}) {
  return (
    <div className="mb-5 flex items-baseline gap-3">
      <h2 className="m-0 text-22 font-extrabold tracking-[-0.02em] @max-[560px]/app:text-[19px]">
        {title}
      </h2>
      {sub && (
        <span className="text-14 text-muted @max-[560px]/app:hidden">
          {sub}
        </span>
      )}
      {onMore && (
        <button
          className="ml-auto py-1 text-14 font-semibold whitespace-nowrap text-muted hover:text-ink"
          onClick={onMore}
        >
          더보기 →
        </button>
      )}
    </div>
  );
}
