import { Skeleton } from "@/components/ui/Skeleton";

/** 댓글 목록을 불러오는 동안의 자리 표시. API 연동 때 로딩 상태에 연결한다 */
export function CommentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="댓글을 불러오는 중">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2.5 border-b border-border py-5"
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-[30px] rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}
