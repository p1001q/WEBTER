import { Skeleton } from "@/components/ui/Skeleton";

/** 리뷰 목록을 불러오는 동안의 자리 표시. API 연동 때 로딩 상태에 연결한다 */
export function ReviewListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="리뷰를 불러오는 중">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 border-b border-border py-5"
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-[30px] rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ))}
    </div>
  );
}
