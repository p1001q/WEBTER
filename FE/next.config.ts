import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";

export default function config(phase: string): NextConfig {
  if (
    phase === PHASE_PRODUCTION_BUILD &&
    process.env.NEXT_PUBLIC_API_BASE_URL &&
    !process.env.CSP_UPLOAD_ORIGINS?.trim()
  )
    throw new Error(
      "실제 API를 사용하는 빌드에는 CSP_UPLOAD_ORIGINS(이미지 PUT 저장소 origin)을 설정해야 합니다.",
    );
  return {
    // next dev가 AI 에이전트를 감지하면 프로젝트 루트에 AGENTS.md를 자동 생성하는 기능을 끈다.
    agentRules: false,
    // 개발 전용 라우트는 `page.dev.tsx` 로 만든다. 확장자 `dev.tsx` 는 next dev에서만 페이지로 인식하므로
    // 프로덕션 빌드의 라우트 표와 번들에는 들어가지 않는다. (`pnpm verify:prod` 가 확인한다)
    pageExtensions:
      phase === PHASE_DEVELOPMENT_SERVER
        ? ["tsx", "ts", "dev.tsx", "dev.ts"]
        : ["tsx", "ts"],
    turbopack: {
      rules: {
        "*.css": {
          // CSS Modules(`*.module.css`)는 Tailwind 로더를 거치면 전역 CSS 로 바뀌어 클래스 이름 변환이 사라진다.
          condition: { not: { path: "*.module.css" } },
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };
}
