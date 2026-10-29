/** 목록 행(서비스 행·오픈소스 행)이 같이 쓰는 클래스 */
export const rowsClass =
  "flex flex-col overflow-hidden rounded-md border border-border bg-card";
export const rowClass =
  "relative flex min-w-0 items-center gap-4 border-t border-light px-6 py-3.5 transition-colors duration-150 first:border-t-0 hover:bg-[#fbfaf7] @max-[560px]/app:gap-3 @max-[560px]/app:px-3.5 @max-[560px]/app:py-3";
export const rowLinkClass =
  "flex min-w-0 flex-1 items-center gap-4 text-inherit";
export const rowRankClass = (top: boolean) =>
  `w-7 shrink-0 text-center font-mono text-14 font-bold ${top ? "text-ink" : "text-muted"}`;
export const rowMainClass = "flex min-w-0 flex-1 flex-col gap-0.5";
export const rowTitleClass =
  "flex min-w-0 items-center gap-2 text-15 font-bold";
export const rowDescClass = "truncate text-13 text-text-2";
export const rowSideClass = "flex shrink-0 items-center gap-3";
