import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // 개발 전용 코드(src/dev, *.dev.tsx)는 그 밖의 파일이 가져오지 못한다. 프로덕션 번들에 섞이지 않게 한다.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/dev/**", "src/**/*.dev.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/dev", "@/dev/*", "**/dev/*"],
              message:
                "개발 전용 코드는 src/dev 와 *.dev.tsx 에서만 가져올 수 있습니다.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
