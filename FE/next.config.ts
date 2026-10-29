import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next dev가 AI 에이전트를 감지하면 프로젝트 루트에 AGENTS.md를 자동 생성하는 기능을 끈다.
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
