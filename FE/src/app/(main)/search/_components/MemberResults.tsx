"use client";

import { useEffect, useState } from "react";
import { realAuth } from "@/api/auth/config";
import {
  searchMembers,
  type MemberSearchPage,
} from "@/api/real/memberSearchApi";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RouteLink } from "@/components/ui/RouteLink";
import { memberKeywordSearch } from "@/domain/memberSearch";
import { useWt } from "@/providers/context";

export function MemberResults({ q }: { q: string }) {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  return (
    <MemberPage
      key={`${q}|${page}|${attempt}`}
      q={q}
      page={page}
      onPage={setPage}
      retry={() => setAttempt((n) => n + 1)}
    />
  );
}

export function MemberPage({
  q,
  page,
  onPage,
  retry,
}: {
  q: string;
  page: number;
  onPage: (page: number) => void;
  retry: () => void;
}) {
  const wt = useWt();
  const [result, setResult] = useState<MemberSearchPage | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!realAuth) return;
    let alive = true;
    searchMembers(q, page).then(
      (data) => {
        if (alive) setResult(data);
      },
      () => {
        if (alive) setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [q, page]);

  const mock = realAuth ? [] : memberKeywordSearch(Object.values(wt.users), q);
  const data = realAuth
    ? result
    : {
        items: mock.slice(page * 20, (page + 1) * 20),
        page,
        size: 20,
        total: mock.length,
      };

  if (failed)
    return (
      <div className="py-10 text-center" role="alert">
        <p className="mb-4 text-text-2">회원 검색 결과를 불러오지 못했어요.</p>
        <Button variant="ghost" onClick={retry}>
          다시 시도
        </Button>
      </div>
    );
  if (!data)
    return (
      <div className="max-w-[760px] py-6" aria-busy="true" role="status">
        <p className="mb-5 text-14 text-muted">회원을 검색하고 있어요…</p>
        <div className="flex flex-col gap-6" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-4">
              <span className="size-12 shrink-0 rounded-full bg-light" />
              <span className="h-10 w-48 rounded-md bg-light" />
            </div>
          ))}
        </div>
      </div>
    );
  if (!data.total && page === 0)
    return (
      <EmptyState
        title="검색된 회원이 없어요"
        desc="아이디나 닉네임으로 다시 검색해 보세요. @는 생략해도 돼요."
        icon="user"
      />
    );
  return (
    <div className="max-w-[760px] pt-5" aria-label="회원 검색 결과">
      <p className="mb-3 text-13 text-muted" role="status">
        회원 {data.total}명
      </p>
      <ul className="m-0 list-none divide-y divide-border p-0">
        {data.items.map((user) => (
          <li key={user.id}>
            <RouteLink
              to="profile"
              params={{ id: user.id }}
              className="flex items-center gap-4 rounded-md px-3 py-5 transition-colors hover:bg-light focus-visible:outline-2 focus-visible:outline-navy"
            >
              <Avatar user={user} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="break-all text-16 font-bold">
                    {user.nick}
                  </span>
                  <span className="break-all font-mono text-13 text-muted">
                    @{user.handle}
                  </span>
                </div>
                {user.bio && (
                  <p className="mt-1 line-clamp-2 text-14 break-words text-text-2">
                    {user.bio}
                  </p>
                )}
              </div>
            </RouteLink>
          </li>
        ))}
      </ul>
      {(page > 0 || data.total > data.size) && (
        <nav
          className="mt-6 flex items-center justify-center gap-4"
          aria-label="회원 검색 페이지"
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => onPage(page - 1)}
          >
            이전
          </Button>
          <span className="text-13 text-muted">
            {page + 1} / {Math.ceil(data.total / data.size)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={(page + 1) * data.size >= data.total}
            onClick={() => onPage(page + 1)}
          >
            다음
          </Button>
        </nav>
      )}
    </div>
  );
}
