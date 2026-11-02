"use client";

import { Icon } from "@/components/ui/Icon";
import { useWt } from "@/providers/context";

/** 서버와 연결되지 않았을 때 헤더 아래에 붙는 안내. 연결이 돌아오거나 다음 요청이 성공하면 사라진다 */
export function NetworkBanner() {
  const wt = useWt();
  if (!wt.offline) return null;
  return (
    <div
      role="alert"
      className="sticky top-header z-20 border-b border-wine-50 bg-wine-50 text-wine @max-[560px]/app:top-14"
    >
      <div className="page-wrap flex min-h-10 items-center gap-2 py-2 text-13 font-medium">
        <Icon name="alert" size={16} />
        <span className="flex-1">
          인터넷 연결이 불안정해요. 연결을 확인하면 다시 이용할 수 있어요.
        </span>
        <button
          type="button"
          className="shrink-0 p-1 font-semibold underline underline-offset-2"
          onClick={wt.dismissOffline}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
