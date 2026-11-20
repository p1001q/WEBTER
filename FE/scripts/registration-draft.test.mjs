import assert from "node:assert/strict";
import test from "node:test";
import {
  harness,
  deferred,
  settle,
  button,
  nodes,
  text,
} from "./helpers/uiHarness.mjs";

const folder = "app/(main)/services/_components/";
function browser(t) {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const old = { window: globalThis.window, document: globalThis.document };
  globalThis.window = Object.assign(new EventTarget(), { scrollY: 50 });
  globalThis.document = Object.assign(new EventTarget(), {
    visibilityState: "visible",
  });
  return () => Object.assign(globalThis, old);
}
function draftHook(api) {
  const h = harness({
    "@/api/auth/config": { realAuth: true },
    "@/api/real/registrationDraftApi": {
      draftImageResolver: () => async (p) => p,
    },
  });
  const { EMPTY_FORM } = h.load(folder + "serviceFormState.ts");
  const { useRegistrationDraft } = h.load(folder + "useRegistrationDraft.ts");
  const session = { api, initial: null };
  const render = (form = EMPTY_FORM) =>
    h.render(() => useRegistrationDraft(session, form, "미완성 태그"));
  return { h, render, form: EMPTY_FORM };
}

test("임시 저장: 변경된 내용만 30초마다 저장하고 성공 표시는 3초 뒤 초기화", async (t) => {
  const restore = browser(t);
  const calls = [];
  const { h, render, form } = draftHook({
    save: async (revision, payload) => {
      calls.push({ revision, payload });
      return { revision: "v1" };
    },
  });
  t.after(() => {
    h.dispose();
    restore();
  });
  render();
  t.mock.timers.tick(30_000);
  await settle();
  assert.equal(calls.length, 0);
  const edited = { ...form, name: "작성 중", agree: true };
  render(edited);
  t.mock.timers.tick(30_000);
  await settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.name, "작성 중");
  assert.equal(calls[0].payload.tagInput, "미완성 태그");
  assert.equal(calls[0].payload.scrollY, 50);
  assert.equal("agree" in calls[0].payload, false);
  assert.equal(render(edited).status, "saved");
  assert.equal(render(edited).automatic, true);
  t.mock.timers.tick(3000);
  assert.equal(render(edited).status, "idle");
  t.mock.timers.tick(30_000);
  await settle();
  assert.equal(calls.length, 1);
});

test("저장 중 추가 입력은 남기고 중복 요청 없이 다음 버전으로 저장", async (t) => {
  const restore = browser(t);
  const pending = deferred();
  const calls = [];
  const { h, render, form } = draftHook({
    save: async (revision, payload) => {
      calls.push({ revision, payload });
      return calls.length === 1 ? pending.promise : { revision: "v2" };
    },
  });
  t.after(() => {
    h.dispose();
    restore();
  });
  render();
  const first = { ...form, name: "첫 입력" };
  const controller = render(first);
  const saving = controller.save();
  await settle();
  render({ ...form, name: "저장 중 새 입력" });
  assert.equal(controller.save(), saving);
  t.mock.timers.tick(30_000);
  await settle();
  assert.equal(calls.length, 1);
  pending.resolve({ revision: "v1" });
  await saving;
  t.mock.timers.tick(30_000);
  await settle();
  assert.equal(calls[1].revision, "v1");
  assert.equal(calls[1].payload.name, "저장 중 새 입력");
});

test("저장 실패는 재시도하고 버전 충돌 후에는 자동 덮어쓰지 않음", async (t) => {
  const restore = browser(t);
  const { h, render, form } = draftHook({
    save: async () => {
      attempts++;
      throw attempts === 1
        ? new Error("연결 실패")
        : new ApiError("rule", "다른 화면에서 변경", "DRAFT_409_01");
    },
  });
  const { ApiError } = h.load("api/errors.ts");
  let attempts = 0;
  t.after(() => {
    h.dispose();
    restore();
  });
  render();
  const edited = { ...form, name: "입력 보존" };
  await render(edited).save();
  assert.match(render(edited).error, /연결 실패/);
  t.mock.timers.tick(30_000);
  await settle();
  assert.equal(attempts, 2);
  assert.match(render(edited).error, /다른 화면/);
  t.mock.timers.tick(60_000);
  await settle();
  assert.equal(attempts, 2);
});

test("이미지는 저장마다 재업로드하지 않고 업로드 실패는 다시 시도", async () => {
  const h = harness({
    "../auth/config": { realAuth: true },
    "./imageUpload": { uploadDataUrl: async () => "unused" },
    "../auth/http": {},
  });
  const { draftImageResolver } = h.load("api/real/registrationDraftApi.ts");
  let calls = 0;
  const resolve = draftImageResolver(async (url) => {
    calls++;
    if (calls === 1) throw new Error("업로드 실패");
    return url.replace("data:", "https://images.example/");
  });
  const payload = {
    iconImg: "data:image",
    thumbImg: "data:image",
    pv: ["data:image"],
  };
  await assert.rejects(resolve(payload));
  const result = await resolve(payload);
  assert.equal(result.iconImg, result.pv[0]);
  await resolve(payload);
  assert.equal(calls, 2);
});

test("새로 작성은 삭제 성공 후 열고, 삭제 실패 때는 기존 임시 저장 유지", async () => {
  const saved = { revision: "v1", payload: { name: "기존 초안" } };
  let fail = true;
  const discarded = [];
  const api = {
    get: async () => saved,
    discard: async (revision) => {
      discarded.push(revision);
      if (fail) throw new Error("삭제 실패");
    },
  };
  const h = harness({
    "@/api/real/registrationDraftApi": { registrationDraftApi: () => api },
    "@/providers/context": { useWt: () => ({ back() {} }) },
  });
  const { RegistrationDraftGate } = h.load(
    folder + "RegistrationDraftGate.tsx",
  );
  const props = {
    userId: "u1",
    children: ({ initial }) => ({ type: "editor", props: { initial } }),
  };
  const render = () => h.render(RegistrationDraftGate, props);
  render();
  await settle();
  assert.match(text(render()), /기존 초안/);
  await button(render(), "새로 작성").props.onClick();
  assert.match(text(render()), /삭제 실패/);
  assert.equal(nodes(render(), (n) => n.type === "editor").length, 0);
  fail = false;
  await button(render(), "새로 작성").props.onClick();
  assert.equal(render().props.initial, null);
  assert.deepEqual(discarded, ["v1", "v1"]);
  h.dispose();
});
