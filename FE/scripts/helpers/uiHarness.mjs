// React 의 상태·effect 경계에서 실제 TSX 이벤트를 실행한다. DOM·브라우저 동작 검증을 대신하지 않는다.
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transpileModule, ModuleKind, JsxEmit } from "typescript";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../src/", import.meta.url));
const same = (a, b) =>
  a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

export const settle = async () => {
  await new Promise(setImmediate);
  await new Promise(setImmediate);
};
export const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
export function nodes(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap((t) => nodes(t, predicate));
  return [
    ...(predicate(tree) ? [tree] : []),
    ...nodes(tree.props?.children, predicate),
  ];
}
export function text(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (Array.isArray(tree)) return tree.map(text).join("");
  return typeof tree === "object" ? text(tree.props?.children) : String(tree);
}
export const button = (tree, label) =>
  nodes(tree, (n) => n.type === "Button" && text(n) === label)[0];

export function harness(imports = {}) {
  const cells = [];
  const cache = new Map();
  let cursor = 0,
    pending = [];
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in cells))
        cells[i] = typeof initial === "function" ? initial() : initial;
      return [
        cells[i],
        (next) => {
          cells[i] = typeof next === "function" ? next(cells[i]) : next;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return (cells[i] ??= { current: initial });
    },
    useId() {
      cursor++;
      return "test-";
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!same(cells[i]?.deps, deps)) cells[i] = { fn, deps };
      return cells[i].fn;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!same(cells[i]?.deps, deps)) {
        const old = cells[i];
        cells[i] = { deps };
        pending.push(() => {
          old?.cleanup?.();
          cells[i].cleanup = fn();
        });
      }
    },
    useSyncExternalStore(_subscribe, _client, server) {
      cursor++;
      return server();
    },
    Suspense: "Suspense",
  };
  const jsx = (type, props) => ({ type, props });
  function load(path) {
    const file = [path, path + ".ts", path + ".tsx", path + "/index.ts"].find(
      (p) => existsSync(p) && /\.tsx?$/.test(p),
    );
    if (!file) throw new Error(`모듈을 찾을 수 없음: ${path}`);
    if (cache.has(file)) return cache.get(file).exports;
    const loaded = { exports: {} };
    cache.set(file, loaded);
    const source = transpileModule(readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: {
        module: ModuleKind.CommonJS,
        jsx: JsxEmit.ReactJSX,
        target: 99,
      },
    }).outputText;
    const localRequire = (id) => {
      if (id in imports) return imports[id];
      if (id === "react") return hooks;
      if (id === "react/jsx-runtime")
        return { jsx, jsxs: jsx, Fragment: "Fragment" };
      if (id.startsWith("@/components/") || id.endsWith("/AuthCard"))
        return new Proxy(
          {},
          { get: (_t, k) => (k === "buttonClass" ? () => "" : k) },
        );
      if (id.startsWith("@/")) return load(resolve(root, id.slice(2)));
      if (id.startsWith(".")) return load(resolve(dirname(file), id));
      return require(id);
    };
    new Function("require", "module", "exports", source)(
      localRequire,
      loaded,
      loaded.exports,
    );
    return loaded.exports;
  }
  return {
    load: (path) => load(resolve(root, path)),
    render(Component, props = {}) {
      cursor = 0;
      pending = [];
      const tree = Component(props);
      pending.forEach((fn) => fn());
      return tree;
    },
    dispose() {
      cells.forEach((c) => c?.cleanup?.());
    },
  };
}
