import type { ReactNode } from "react";

/** 목록·검색 화면 위쪽의 제목과 설명 */
export function ListHead({
  title,
  desc,
  variant = "page",
  action,
  flush,
}: {
  title: ReactNode;
  desc?: string;
  /** result: 검색 결과 제목(24px, 위쪽 여백 28px) */
  variant?: "page" | "result";
  /** 제목 줄 오른쪽 동작(버튼 등). 오른쪽 끝에 두려면 `ml-auto` 를 준다 */
  action?: ReactNode;
  /** 아래 여백 없음 */
  flush?: boolean;
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
      className={`flex flex-wrap items-end gap-4 ${flush ? "pb-0" : "pb-4"} ${result ? "pt-7" : "pt-8"}`}
    >
      {result ? (
        heading
      ) : (
        <div>
          {heading}
          {desc && <p className="mt-1.5 text-[14.5px] text-muted">{desc}</p>}
        </div>
      )}
      {action}
    </div>
  );
}
