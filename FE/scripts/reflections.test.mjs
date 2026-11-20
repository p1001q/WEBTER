import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsx from "react/jsx-runtime";
import { harness, nodes, button, text } from "./helpers/uiHarness.mjs";

test("회고 작성은 선택한 내 서비스와 마크다운을 저장하며 실패 시 입력 유지", async (t) => {
  const previous = globalThis.window;
  globalThis.window = new EventTarget();
  let failure = true,
    saved = 0;
  const calls = [];
  const h = harness({
    "@/api/real/reflectionApi": {
      reflectionApi: () => ({
        save: async (...args) => {
          calls.push(args);
          if (failure) throw new Error("연결 실패");
        },
      }),
    },
  });
  t.after(() => {
    h.dispose();
    globalThis.window = previous;
  });
  const { ReflectionWritePanel } = h.load(
    "app/(main)/mypage/_components/ReflectionWritePanel.tsx",
  );
  const props = {
    userId: "u1",
    services: [{ id: "12", name: "내 서비스" }],
    onSaved: () => saved++,
  };
  const render = () => h.render(ReflectionWritePanel, props);
  let tree = render();
  assert.equal(button(tree, "회고 저장").props.disabled, true);
  nodes(tree, (n) => n.type === "select")[0].props.onChange({
    target: { value: "12" },
  });
  nodes(tree, (n) => n.type === "input")[0].props.onChange({
    target: { value: "첫 회고" },
  });
  nodes(tree, (n) => n.type === "MarkdownEditor")[0].props.onChange(
    "# 배운 점\n\n**내용**",
  );
  await button(render(), "회고 저장").props.onClick();
  tree = render();
  assert.match(text(tree), /연결 실패/);
  assert.equal(
    nodes(tree, (n) => n.type === "input")[0].props.value,
    "첫 회고",
  );
  assert.equal(
    nodes(tree, (n) => n.type === "MarkdownEditor")[0].props.value,
    "# 배운 점\n\n**내용**",
  );
  assert.equal(saved, 0);
  failure = false;
  await button(render(), "회고 저장").props.onClick();
  assert.equal(saved, 1);
  assert.deepEqual(calls[1], [
    null,
    { serviceId: "12", title: "첫 회고", body: "# 배운 점\n\n**내용**" },
    "내 서비스",
  ]);
});

test("마크다운 제목·표·코드 렌더링과 HTML·실행 링크 차단", () => {
  const h = harness({ "react/jsx-runtime": jsx });
  const { MarkdownContent } = h.load("components/ui/MarkdownContent.tsx");
  const html = renderToStaticMarkup(
    createElement(
      MarkdownContent,
      null,
      "# 제목\n\n**강조**\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```js\nconst n = 1;\n```\n\n<script>alert(1)</script>\n\n[실행](javascript:alert(1))",
    ),
  );
  assert.match(html, /<h1[^>]*>제목<\/h1>/);
  assert.match(html, /<strong>강조<\/strong>/);
  assert.match(html, /<table/);
  assert.match(html, /<code class="language-js"/);
  assert.doesNotMatch(html, /<script|href="javascript:/);
});
