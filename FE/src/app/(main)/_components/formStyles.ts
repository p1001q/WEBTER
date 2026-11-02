import { cx } from "@/lib/cx";

/** 서비스 등록·수정, 마이페이지 설정이 같이 쓰는 폼 레이아웃 클래스 */

/** 폼 영역 + 오른쪽 안내(큰 화면), 좁은 화면에서는 한 줄 */
export const formLayoutClass =
  "mt-6 grid grid-cols-[minmax(0,1fr)_var(--spacing-form-aside)] items-start gap-12 @max-[860px]/app:grid-cols-[minmax(0,1fr)] @max-[860px]/app:gap-6";
export const settingsLayoutClass =
  "mt-6 grid grid-cols-[minmax(0,1fr)_280px] items-start gap-12 @max-[860px]/app:grid-cols-[minmax(0,1fr)] @max-[860px]/app:gap-6";
export const formClass = "flex min-w-0 flex-col gap-6";
export const sectionClass =
  "m-0 flex min-w-0 flex-col gap-[22px] rounded-lg border border-border bg-card px-7 pt-6 pb-7 @max-[560px]/app:px-4 @max-[560px]/app:py-5";
export const sectionTitleClass =
  "m-0 flex items-center gap-2 text-[17px] font-extrabold tracking-[-0.01em] [&_small]:text-12 [&_small]:font-medium [&_small]:text-muted";
export const twoColumnClass =
  "grid grid-cols-2 gap-4 @max-[560px]/app:grid-cols-1";
export const optionRowClass = "flex flex-wrap gap-2";
export const submitBarClass =
  "flex flex-wrap items-center justify-end gap-3 pt-2";

/** 여러 보기 중 고르는 버튼 */
export const optionButtonClass = (on: boolean) =>
  cx(
    "inline-flex h-[38px] items-center gap-1.5 rounded-md border px-3.5 text-14 font-semibold",
    on ? "border-navy bg-navy-50 text-navy" : "border-border bg-card",
  );

/** 파일 선택 영역(점선 상자). 안의 file input 은 보이지 않지만 키보드로 닿는다 */
export const dropClass = (err?: boolean, thin?: boolean) =>
  cx(
    "relative flex cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-md border-dashed bg-card p-3 text-center text-13 text-muted hover:border-navy hover:text-navy focus-within:border-navy focus-within:text-navy [&>input]:absolute [&>input]:size-px [&>input]:opacity-0",
    // thin: 미리보기 칸의 얇은 테두리(보관본은 .wt-pv 의 테두리가 이긴다)
    thin ? "border border-border" : "border-[1.5px] border-border-strong",
    err && "border-wine!",
  );

/** 올린 이미지 위의 삭제 버튼 */
export const removeImageClass =
  "absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full border-0 bg-ink text-white";

/** 큰 화면에서 스크롤을 따라오는 오른쪽 열 */
export const stickyAsideClass =
  "sticky top-[88px] flex flex-col gap-4 @max-[860px]/app:static";
