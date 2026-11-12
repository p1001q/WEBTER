"use client";

// 개발 전용(보관본에는 없음): 화면 이동·뒤로 가기·상태 유지를 직접 눌러 확인하는 패널.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RouteLink } from "@/components/ui/RouteLink";
import { useWt } from "@/providers/context";
import { DEV_ONLY_MARKER } from "./marker";

const btn =
  "h-8 rounded-pill border border-border-strong bg-white px-3.5 text-13";

function Query() {
  return <b data-q="">{useSearchParams().toString() || "(없음)"}</b>;
}

export function NavTests() {
  const wt = useWt();
  return (
    <div
      data-fe-only=""
      data-dev-marker={DEV_ONLY_MARKER}
      className="page-wrap pt-6 text-13"
    >
      <div className="rounded-md border border-border bg-card p-4">
        <div className="font-bold">이동 확인</div>
        <div className="mt-1 text-muted">
          좋아요 {wt.likes.size} · 저장 {wt.saves.size} · 로그인{" "}
          {wt.me ? "예" : "아니오"} · 쿼리{" "}
          <Suspense fallback="…">
            <Query />
          </Suspense>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btn} onClick={() => wt.go("home")}>
            go(home)
          </button>
          <button className={btn} onClick={() => wt.go("search", { q: "a" })}>
            go(search ?q=a)
          </button>
          <button
            className={btn}
            onClick={() => wt.go("search", { q: "r" }, { replace: true })}
          >
            go(search ?q=r, replace)
          </button>
          <button className={btn} onClick={() => wt.back()}>
            back()
          </button>
          <button className={btn} onClick={() => window.history.forward()}>
            forward
          </button>
          <Link
            className={btn + " inline-grid place-items-center"}
            href="/dev/shell/other"
          >
            Link→other
          </Link>
          <Link
            className={btn + " inline-grid place-items-center"}
            href="/dev/shell?x=1"
          >
            Link→?x=1
          </Link>
          <Link
            className={btn + " inline-grid place-items-center"}
            href="/dev/shell?x=2"
          >
            Link→?x=2
          </Link>
          <Link
            replace
            className={btn + " inline-grid place-items-center"}
            href="/dev/shell?x=3"
          >
            Link replace→?x=3
          </Link>
          <RouteLink
            to="home"
            className={btn + " inline-grid place-items-center"}
          >
            RouteLink(home)
          </RouteLink>
          {/* 전체 새로고침(문서 이동)으로 상태 초기화를 확인하려고 일부러 <a> 를 쓴다 */}
          <a
            className={btn + " inline-grid place-items-center"}
            href="/dev/shell"
          >
            /dev/shell
          </a>
          <a
            className={btn + " inline-grid place-items-center"}
            href="/dev/shell/other"
          >
            /dev/shell/other
          </a>
        </div>
      </div>
    </div>
  );
}
