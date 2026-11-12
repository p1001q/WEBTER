"use client";

import { useEffect, useRef, useState } from "react";
import { type ApiError, toApiError } from "@/api/errors";
import type { CursorPage } from "@/api/real/interactionApi";

interface Result extends CursorPage<string> {
  scope: string;
  revision: number;
  error?: ApiError;
}

export function useCursorList(
  scope: string,
  revision: number,
  enabled: boolean,
  load: (cursor?: string) => Promise<CursorPage<string>>,
) {
  const [result, setResult] = useState<Result>();
  const [attempt, setAttempt] = useState(0);
  const [morePending, setMorePending] = useState<{
    scope: string;
    revision: number;
  }>();
  const lifecycle = useRef({ request: 0, moreLock: null as number | null });

  useEffect(() => {
    if (!enabled) return;
    const active = lifecycle.current;
    const id = ++active.request;
    void load().then(
      (page) => {
        if (active.request !== id) return;
        setMorePending(undefined);
        setResult({ ...page, scope, revision });
      },
      (error: unknown) => {
        if (active.request !== id) return;
        setMorePending(undefined);
        setResult((old) => ({
          items: old?.scope === scope ? old.items : [],
          nextCursor: null,
          scope,
          revision,
          error: toApiError(error),
        }));
      },
    );
    return () => {
      active.request++;
      active.moreLock = null;
    };
  }, [attempt, enabled, load, revision, scope]);

  const current = enabled && result?.scope === scope ? result : undefined;
  const loading = enabled && current?.revision !== revision;
  const loadMore = async () => {
    const active = lifecycle.current;
    if (!current?.nextCursor || loading || active.moreLock !== null) return;
    const id = active.request;
    active.moreLock = id;
    setMorePending({ scope, revision });
    try {
      const page = await load(current.nextCursor);
      if (active.request === id)
        setResult({
          ...page,
          scope,
          revision,
          items: [...new Set([...current.items, ...page.items])],
        });
    } catch (error) {
      if (active.request === id)
        setResult({ ...current, error: toApiError(error) });
    } finally {
      if (active.moreLock === id) {
        active.moreLock = null;
        setMorePending(undefined);
      }
    }
  };

  return {
    ids: current?.items ?? [],
    error: current?.error,
    loading,
    hasMore: !!current?.nextCursor,
    morePending:
      morePending?.scope === scope && morePending.revision === revision,
    loadMore,
    retry: () => {
      if (current?.nextCursor) void loadMore();
      else {
        setResult(undefined);
        setMorePending(undefined);
        setAttempt((n) => n + 1);
      }
    },
  };
}
