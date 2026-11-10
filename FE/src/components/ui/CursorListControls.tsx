"use client";

import { Button } from "./Button";

export function CursorListControls({
  label,
  error,
  hasMore,
  pending,
  loadMore,
  retry,
}: {
  label: string;
  error?: Error;
  hasMore: boolean;
  pending: boolean;
  loadMore: () => void;
  retry: () => void;
}) {
  if (!error && !hasMore) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-4">
      {error ? (
        <>
          <p className="m-0 text-14 text-wine" role="alert">
            {error.message}
          </p>
          <Button size="sm" variant="ghost" onClick={retry} disabled={pending}>
            다시 시도
          </Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" onClick={loadMore} disabled={pending}>
          {pending ? "불러오는 중…" : label}
        </Button>
      )}
    </div>
  );
}
