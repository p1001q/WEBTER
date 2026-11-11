import assert from "node:assert/strict";
import { test } from "node:test";
import { harness } from "./helpers/uiHarness.mjs";

const { parseLegalMarkdown, parseInline } = harness().load(
  "components/legal/markdown.ts",
);

test("굵게와 코드만 해석하고 나머지는 글자 그대로 둔다", () => {
  assert.deepEqual(parseInline("**서비스:** `이용하기` <b>태그</b>"), [
    { kind: "bold", text: "서비스:" },
    { kind: "text", text: " " },
    { kind: "code", text: "이용하기" },
    { kind: "text", text: " <b>태그</b>" },
  ]);
});

test("제목·인용·목록·문단을 구분하고 이어진 줄은 한 블록으로 묶는다", () => {
  const blocks = parseLegalMarkdown(
    [
      "> 초안(임시)입니다.",
      "",
      "## 제1조 목적",
      "",
      "첫 줄",
      "둘째 줄",
      "",
      "- 하나",
      "- 둘",
    ].join("\n"),
  );
  assert.deepEqual(
    blocks.map((b) => b.kind),
    ["quote", "heading", "paragraph", "list"],
  );
  assert.equal(blocks[1].text, "제1조 목적");
  assert.equal(blocks[2].inline[0].text, "첫 줄 둘째 줄");
  assert.equal(blocks[3].items.length, 2);
});

test("표는 머리글과 행으로 나눈다", () => {
  const [table] = parseLegalMarkdown(
    [
      "| 구분 | 항목 |",
      "|---|---|",
      "| 계정 | **이메일** |",
      "| 기록 | 시각 |",
    ].join("\n"),
  );
  assert.equal(table.kind, "table");
  assert.equal(table.head.length, 2);
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[0][1][0].kind, "bold");
});

test("HTML 태그는 만들지 않고 글자로만 남긴다", () => {
  const [p] = parseLegalMarkdown("<script>alert(1)</script>");
  assert.equal(p.kind, "paragraph");
  assert.equal(p.inline[0].kind, "text");
  assert.equal(p.inline[0].text, "<script>alert(1)</script>");
});
