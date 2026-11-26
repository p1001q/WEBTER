import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL("../src/components/ui/MarkdownContent.tsx", import.meta.url),
  "utf8",
);
const code = ts
  .transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  })
  .outputText.replace(
    /from "([^"]+)"/g,
    (_all, id) =>
      `from ${JSON.stringify(pathToFileURL(require.resolve(id)).href)}`,
  );
const { MarkdownContent } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const render = (text) =>
  renderToStaticMarkup(React.createElement(MarkdownContent, null, text));

test("실제 마크다운 렌더러는 HTML·이벤트 속성·위험한 링크를 실행 가능한 태그로 만들지 않는다", () => {
  for (const payload of [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "[x](javascript:alert%281%29)",
    "[x](data:text/html;base64,PHNjcmlwdD4=)",
    "[x](vbscript:msgbox%281%29)",
  ])
    assert.doesNotMatch(
      render(payload),
      /<script\b|<img[^>]*\bonerror\s*=|href="(?:javascript|data|vbscript):/i,
    );
});

test("정상 마크다운 링크·이미지·표를 유지하고 새 탭의 opener를 차단한다", () => {
  const html = render(
    "[정상](https://example.test)\n\n![이미지](https://images.example.test/a.png)\n\n|열|\n|---|\n|값|",
  );
  assert.match(html, /href="https:\/\/example.test"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /<img[^>]*src="https:\/\/images.example.test\/a.png"/);
  assert.match(html, /<table>/);
});
