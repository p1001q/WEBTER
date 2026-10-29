import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로젝트 작업 지침은 상위 AGENTS.md에서만 관리합니다.
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
