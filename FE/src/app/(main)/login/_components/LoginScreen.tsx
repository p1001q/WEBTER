"use client";

import { useState } from "react";
import { realAuth } from "@/api/auth/config";
import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/Button";
import { boxClass } from "@/components/ui/box";
import { helpClass } from "@/components/ui/field";
import { safeBackPath } from "@/lib/routes";
import { useWt } from "@/providers/context";
import { AuthCard, authSubClass } from "../../_components/AuthCard";

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
    />
    <path
      fill="#FBBC05"
      d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z"
    />
    <path
      fill="#EA4335"
      d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z"
    />
  </svg>
);

const ERROR_TEXT: Record<string, string> = {
  cancelled: "구글 로그인이 취소됐어요. 다시 시도해 주세요.",
  failed: "구글 로그인에 실패했어요. 잠시 뒤에 다시 시도해 주세요.",
};

/**
 * 로그인. 백엔드 주소가 설정돼 있으면 구글 로그인으로 이동하고, 없으면(데모) 결과를 골라 이어 간다.
 * 돌아갈 주소는 `back` 쿼리, 로그인 실패 사유는 `error` 쿼리(cancelled·failed)
 */
export function LoginScreen({
  back,
  error,
}: {
  back?: string;
  error?: string;
}) {
  const wt = useWt();
  const [pick, setPick] = useState(false);
  return (
    <AuthCard data-component="login-card">
      <Wordmark size={26} />
      <h1>웹터 시작하기</h1>
      <p className={authSubClass}>
        소셜 계정 하나로 탐색·등록·리뷰를 모두 이용할 수 있어요.
      </p>
      <button
        type="button"
        className="inline-flex h-[52px] w-full whitespace-nowrap items-center justify-center gap-3 rounded-md border border-border bg-card text-15 font-semibold transition-colors duration-150 hover:border-border-strong"
        onClick={() => (realAuth ? wt.login(back) : setPick(true))}
      >
        <GoogleMark />
        Google로 계속하기
      </button>
      {error && ERROR_TEXT[error] && (
        <p className={`${helpClass} mt-1.5 text-center text-wine`} role="alert">
          {ERROR_TEXT[error]}
        </p>
      )}
      {!realAuth && pick && (
        <div
          className={`${boxClass} mt-1.5 flex flex-col gap-2 bg-[#fbfaf7]! p-3.5`}
          data-component="demo-auth"
        >
          <span className={helpClass}>
            데모 — 실제 Google 로그인은 호출하지 않아요. 결과를 골라 주세요.
          </span>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => wt.login(back)}>
              기존 회원으로 로그인
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => wt.go("onboarding", { back })}
            >
              신규 회원으로 가입
            </Button>
          </div>
        </div>
      )}
      {safeBackPath(back) && (
        <p className={`${helpClass} mt-1.5 text-center`}>
          로그인 후 보던 페이지로 돌아가요.
        </p>
      )}
    </AuthCard>
  );
}
