"use client";

import { Button } from "@/components/ui/Button";

/** 앱 셸을 불러오는 중 오류가 났을 때(초기 데이터 조회 실패 등) */
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto my-24 flex max-w-[520px] flex-col items-center gap-3 px-4 text-center">
      <h1 className="m-0 text-2xl font-extrabold">문제가 생겼어요</h1>
      <p className="m-0 text-text-2">
        데이터를 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
