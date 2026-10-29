// 프로덕션 빌드(.next)에 개발 전용 코드가 들어갔는지 확인한다. `pnpm verify:prod` 가 build 뒤에 실행한다.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// src/dev/marker.ts 의 값과 같아야 한다.
const MARKER = "__WEBTER_DEV_ONLY_9f3a__";
const ROOTS = [".next/server", ".next/static"];
const problems = [];

if (!existsSync(".next/server")) {
  console.error(
    "verify:prod: .next/server 가 없습니다. 먼저 next build 를 실행하세요.",
  );
  process.exit(1);
}
if (existsSync(".next/server/app/dev")) {
  problems.push(".next/server/app/dev 라우트 산출물이 있습니다.");
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (readFileSync(path).includes(MARKER))
      problems.push(`${path} 에 개발 전용 마커가 있습니다.`);
  }
}
ROOTS.filter(existsSync).forEach(walk);

if (problems.length) {
  console.error("verify:prod 실패:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("verify:prod 통과: 프로덕션 빌드에 개발 전용 코드가 없습니다.");
