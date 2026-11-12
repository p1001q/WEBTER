import type { ReactNode } from "react";

/** 로그인·온보딩의 가운데 카드. 제목(h1)과 안내(.sub) 모양은 카드가 정한다 */
export function AuthCard({
  wide,
  children,
  ...data
}: {
  wide?: boolean;
  children: ReactNode;
  "data-component"?: string;
  "data-step"?: number;
}) {
  return (
    <div className="flex flex-col items-center px-5 pt-18 pb-24 @max-[560px]/app:px-4 @max-[560px]/app:pt-8 @max-[560px]/app:pb-16">
      <div
        className={`flex w-full flex-col gap-3 rounded-lg border border-border bg-card px-9 py-10 @max-[560px]/app:px-[22px] @max-[560px]/app:py-7 [&_h1]:mt-4 [&_h1]:mb-0 [&_h1]:text-[24px] [&_h1]:font-extrabold [&_h1]:tracking-[-0.02em] ${wide ? "max-w-[520px]" : "max-w-[420px]"}`}
        {...data}
      >
        {children}
      </div>
    </div>
  );
}

/** AuthCard 안의 부제목 */
export const authSubClass = "mb-4 text-14 text-muted";
