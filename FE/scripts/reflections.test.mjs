import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsx from "react/jsx-runtime";
import {
  harness,
  nodes,
  button,
  text,
  deferred,
  settle,
} from "./helpers/uiHarness.mjs";

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

const entry = {
  id: "r1",
  serviceId: "12",
  serviceName: "서비스",
  title: "원래 회고",
  body: "원문",
  revision: "v1",
  updatedAt: "2026-11-20",
  createdAt: "2026-11-20",
};
function homeHarness(api) {
  const h = harness({
    "@/providers/context": {
      useWt: () => ({ services: [{ id: "12", name: "서비스", owner: "u1" }] }),
    },
    "@/api/real/reflectionApi": { reflectionApi: () => api },
  });
  const { ReflectionsHome } = h.load(
    "app/(main)/mypage/_components/ReflectionsPanel.tsx",
  );
  const props = { userId: "u1", onWrite() {}, active: true, refreshKey: 0 };
  return {
    h,
    render: (over = {}) => h.render(ReflectionsHome, { ...props, ...over }),
  };
}
const pageOf = (
  total = 1,
  page = 0,
  items = [{ ...entry, excerpt: "내용" }],
) => ({ total, size: 20, page, items });

test("회고 목록 갱신 중에도 열어둔 수정 모달은 유지", async (t) => {
  const { h, render } = homeHarness({
    list: async () => pageOf(),
    get: async () => entry,
  });
  t.after(() => h.dispose());
  render();
  await settle();
  await nodes(
    render(),
    (n) => n.type === "button" && text(n).includes("원래 회고"),
  )[0].props.onClick();
  assert.equal(
    nodes(render(), (n) => n.type?.name === "ReflectionModal")[0].props.note.id,
    "r1",
  );
  const refreshing = render({ refreshKey: 1 });
  assert.equal(
    nodes(refreshing, (n) => n.type?.name === "ReflectionModal")[0].props.note
      .id,
    "r1",
  );
  await settle();
  assert.equal(
    nodes(render({ refreshKey: 1 }), (n) => n.type?.name === "ReflectionModal")
      .length,
    1,
  );
});

test("작성 탭으로 이동하면 대기 중인 회고 상세 열기는 무효화", async (t) => {
  const pending = deferred();
  const { h, render } = homeHarness({
    list: async () => pageOf(),
    get: () => pending.promise,
  });
  t.after(() => h.dispose());
  render();
  await settle();
  const opening = nodes(
    render(),
    (n) => n.type === "button" && text(n).includes("원래 회고"),
  )[0].props.onClick();
  render({ active: false });
  pending.resolve(entry);
  await opening;
  assert.equal(
    nodes(render({ active: false }), (n) => n.type?.name === "ReflectionModal")
      .length,
    0,
  );
  render();
  await settle();
  assert.equal(
    nodes(
      render(),
      (n) => n.type === "button" && text(n).includes("원래 회고"),
    )[0].props.disabled,
    false,
  );
});

test("회고 수가 줄어 마지막 페이지가 사라지면 유효한 페이지를 다시 조회", async (t) => {
  const calls = [];
  const { h, render } = homeHarness({
    list: async (page) => {
      calls.push(page);
      return page === 1
        ? pageOf(20, 1, [])
        : pageOf(calls.length === 1 ? 21 : 20);
    },
  });
  t.after(() => h.dispose());
  render();
  await settle();
  button(render(), "다음").props.onClick();
  render();
  await settle();
  render();
  await settle();
  assert.deepEqual(calls, [0, 1, 0]);
  assert.match(text(render()), /원래 회고/);
});

test("회고 충돌 때 입력은 유지하고 최신 내용 확인 후 새 버전으로 재저장", async (t) => {
  const previous = globalThis.window;
  globalThis.window = new EventTarget();
  const h = harness({ "@/providers/context": { useWt: () => ({}) } });
  t.after(() => {
    h.dispose();
    globalThis.window = previous;
  });
  const { ApiError } = h.load("api/errors.ts");
  const { ReflectionModal } = h.load(
    "app/(main)/mypage/_components/ReflectionsPanel.tsx",
  );
  const calls = [];
  let done = 0;
  const api = {
    get: async () => ({ ...entry, revision: "v2", body: "다른 창의 변경" }),
    save: async (note, input) => {
      calls.push({ note, input });
      if (calls.length === 1)
        throw new ApiError("rule", "다른 화면에서 변경", "REFLECTION_409_01");
    },
  };
  const props = {
    api,
    note: entry,
    services: [{ id: "12", name: "서비스" }],
    onClose() {},
    onDone() {
      done++;
    },
  };
  const render = () => h.render(ReflectionModal, props);
  button(render(), "수정").props.onClick();
  nodes(render(), (n) => n.type === "MarkdownEditor")[0].props.onChange(
    "현재 작성 중인 변경",
  );
  button(render(), "회고 저장").props.onClick();
  await settle();
  let tree = render();
  assert.equal(button(tree, "회고 저장").props.disabled, true);
  assert.equal(
    nodes(tree, (n) => n.type === "MarkdownEditor")[0].props.value,
    "현재 작성 중인 변경",
  );
  assert.match(text(tree), /다른 창의 변경/);
  button(tree, "최신 내용 확인했어요").props.onClick();
  button(render(), "회고 저장").props.onClick();
  await settle();
  assert.equal(calls[1].note.revision, "v2");
  assert.equal(calls[1].input.body, "현재 작성 중인 변경");
  assert.equal(done, 1);
});

test("모달 Escape는 최신 닫기 함수를 호출하고 저장 중에는 닫지 않음", (t) => {
  const previous = { window: globalThis.window, document: globalThis.document };
  globalThis.window = new EventTarget();
  globalThis.document = { activeElement: null };
  const h = harness({ "@/lib/useScrollLock": { useScrollLock() {} } });
  t.after(() => {
    h.dispose();
    Object.assign(globalThis, previous);
  });
  const { Modal } = h.load("components/ui/Modal.tsx");
  let old = 0,
    latest = 0;
  h.render(Modal, { onClose: () => old++ });
  h.render(Modal, { onClose: () => latest++ });
  const escape = () =>
    window.dispatchEvent(
      Object.assign(new Event("keydown"), { key: "Escape" }),
    );
  escape();
  assert.equal(old, 0);
  assert.equal(latest, 1);
  h.render(Modal, { onClose: () => latest++, locked: true });
  escape();
  assert.equal(latest, 1);
});
