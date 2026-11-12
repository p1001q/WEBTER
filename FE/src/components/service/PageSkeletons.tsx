import { MainNav } from "@/components/layout/MainNav";
import { Skeleton } from "@/components/ui/Skeleton";
import { ServiceListSkeleton } from "./ServiceListSkeleton";

/** 트렌딩·인기·최신처럼 제목과 서비스 목록이 있는 화면의 로딩 자리 표시 */
export function ListPageSkeleton({ nav = true }: { nav?: boolean }) {
  return (
    <>
      {nav && <MainNav />}
      <div className="page-wrap" role="status" aria-label="불러오는 중">
        <div className="pt-8 pb-6">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        </div>
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-border py-3">
          <Skeleton className="h-9 w-28 rounded-pill" />
          <Skeleton className="h-9 w-48 rounded-pill @max-[560px]/app:hidden" />
          <Skeleton className="h-9 w-36 rounded-pill" />
        </div>
        <ServiceListSkeleton view="card" />
      </div>
    </>
  );
}

/** 서비스 상세의 로딩 자리 표시: 아이콘·이름·통계·본문 */
export function DetailPageSkeleton() {
  return (
    <div className="page-wrap" role="status" aria-label="불러오는 중">
      <Skeleton className="my-6 h-4 w-52" />
      <div className="grid grid-cols-[minmax(0,1fr)_var(--spacing-detail-cta)] gap-12 @max-[860px]/app:grid-cols-1 @max-[860px]/app:gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-6 @max-[560px]/app:gap-4">
            <Skeleton className="size-24 shrink-0 rounded-[24px]" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-5 w-full max-w-md" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[52px] rounded-md" />
          <Skeleton className="h-10 rounded-md" />
        </div>
      </div>
      <Skeleton className="mt-8 h-20" />
      <Skeleton className="mt-8 aspect-[16/6] w-full" />
      <div className="mt-6 flex flex-col gap-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/** 마이페이지·프로필 같은 일반 화면의 로딩 자리 표시 */
export function GenericPageSkeleton() {
  return (
    <div className="page-wrap" role="status" aria-label="불러오는 중">
      <div className="flex items-center gap-6 pt-8 pb-6">
        <Skeleton className="size-20 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-12 w-full max-w-xl" />
      <div className="mt-6">
        <ServiceListSkeleton view="card" />
      </div>
    </div>
  );
}
