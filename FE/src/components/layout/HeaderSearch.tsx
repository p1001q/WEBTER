"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRoute } from "@/lib/useRoute";
import { useWt } from "@/providers/context";
import { SearchBar } from "./SearchBar";

/** 검색 화면으로 이동해도 같은 입력 노드를 유지해 위치·입력·포커스가 이어진다. */
export function HeaderSearch() {
  const route = useRoute();
  const wt = useWt();
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/search");
  }, [router]);
  return (
    <SearchBar
      initial={route.name === "search" ? (route.query.q ?? "") : ""}
      size="sm"
      autoFocus={route.name === "search" && !route.query.q}
      onActivate={() => {
        if (route.name !== "search") wt.go("search");
      }}
    />
  );
}
