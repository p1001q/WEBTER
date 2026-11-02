"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { useWt } from "@/providers/context";

/** 둘러볼 서비스가 하나도 없을 때(아직 등록된 서비스가 없거나 전부 이용할 수 없는 상태) */
export function NoServices() {
  const wt = useWt();
  return (
    <EmptyState
      title="지금 둘러볼 수 있는 서비스가 없어요"
      desc="서비스가 등록되면 이곳에 보여 드려요. 첫 서비스를 직접 등록해 보세요."
      action="서비스 등록하기"
      onAction={() =>
        wt.requireLogin(
          () => wt.go("register"),
          "서비스를 등록하려면 로그인이 필요해요.",
        )
      }
      icon="plus"
    />
  );
}
