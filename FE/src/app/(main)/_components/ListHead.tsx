import type { ReactNode } from "react";

/** 목록·검색·오픈소스 화면 위쪽의 제목과 설명 */
export function ListHead({
  title,
  desc,
  variant = "page",
}: {
  title: ReactNode;
  desc?: string;
  /** result: 검색 결과 제목(24px, 위쪽 여백 28px) */
  variant?: "page" | "result";
}) {
  const result = variant === "result";
  const heading = (
    <h1
      className={`m-0 flex items-center gap-2.5 font-extrabold tracking-[-0.025em] ${result ? "text-[24px]" : "text-28 @max-[560px]/app:text-[23px]"}`}
    >
      {title}
    </h1>
  );
  return (
    <div
      className={`flex flex-wrap items-end gap-4 pb-4 ${result ? "pt-7" : "pt-8"}`}
    >
      {result ? (
        heading
      ) : (
        <div>
          {heading}
          {desc && <p className="mt-1.5 text-[14.5px] text-muted">{desc}</p>}
        </div>
      )}
    </div>
  );
}
