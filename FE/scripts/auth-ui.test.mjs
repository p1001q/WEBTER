import assert from "node:assert/strict";
import { test } from "node:test";
import {
  harness,
  nodes,
  button,
  text,
  settle,
  deferred,
} from "./helpers/uiHarness.mjs";

const policies = (version) =>
  ["TERMS", "PRIVACY", "AGE_CONFIRMATION"].map((documentType) => ({
    documentType,
    version,
    title: documentType,
  }));
const onboardingPath = "app/(main)/onboarding/_components/OnboardingScreen.tsx";

async function onboarding({
  signup,
  checkUsername = async () => true,
  fetchPolicies = async () => policies("v1"),
}) {
  const wt = { go() {}, takenHandles: [], signup };
  const h = harness({
    "@/api/auth/config": { realAuth: true },
    "@/api/auth/authApi": {
      fetchSession: async () => ({ status: "SIGNUP_PENDING" }),
      fetchCurrentPolicies: fetchPolicies,
      checkUsername,
    },
    "@/providers/context": {
      useWt: () => wt,
    },
  });
  const { OnboardingScreen } = h.load(onboardingPath);
  const render = () => h.render(OnboardingScreen, { step: 1 });
  render();
  await settle();
  let tree = render();
  nodes(
    tree,
    (n) => n.type === "input" && n.props.type === "checkbox",
  )[0].props.onChange({ target: { checked: true } });
  tree = render();
  button(tree, "다음").props.onClick();
  tree = render();
  nodes(
    tree,
    (n) => n.props?.placeholder === "예: dawn.code",
  )[0].props.onChange({ target: { value: "new.maker" } });
  nodes(tree, (n) => n.props?.placeholder === "예: 새벽코딩")[0].props.onChange(
    { target: { value: "새내기" } },
  );
  tree = render();
  button(tree, "다음").props.onClick();
  tree = render();
  return { h, render, tree };
}

test("온보딩의 시작·건너뛰기 광클은 중복 확인부터 가입 응답까지 한 요청만 보낸다", async (t) => {
  const checked = deferred(),
    submitted = deferred();
  let checks = 0,
    signups = 0;
  const { h, render, tree } = await onboarding({
    checkUsername: () => {
      checks++;
      return checked.promise;
    },
    signup: () => {
      signups++;
      return submitted.promise;
    },
  });
  t.after(() => h.dispose());
  const first = button(tree, "시작하기").props.onClick();
  button(tree, "건너뛰기").props.onClick();
  assert.equal(checks, 1);
  assert.equal(signups, 0);
  checked.resolve(true);
  await settle();
  assert.equal(signups, 1);
  assert.equal(button(render(), "가입 중…").props.disabled, true);
  button(tree, "시작하기").props.onClick();
  assert.equal(checks, 1);
  submitted.resolve(false);
  await first;
  await settle();
  assert.equal(button(render(), "시작하기").props.disabled, false);
});

test("약관 변경 응답은 최신 버전을 다시 받고 체크 해제·약관 단계로 복구한다", async (t) => {
  let loads = 0,
    signups = 0;
  const { h, render, tree } = await onboarding({
    fetchPolicies: async () => policies(++loads === 1 ? "v1" : "v2"),
    signup: async (input) => {
      signups++;
      assert.equal(input.consents[0].version, "v1");
      return "policyChanged";
    },
  });
  t.after(() => h.dispose());
  button(tree, "시작하기").props.onClick();
  await settle();
  let recovered = render();
  assert.equal(recovered.props["data-step"], 1);
  assert.equal(loads, 2);
  assert.equal(signups, 1);
  assert.match(text(recovered), /약관이 변경/);
  assert.match(text(recovered), /v2/);
  assert.ok(
    nodes(recovered, (n) => n.type === "input").every(
      (n) => n.props.checked === false,
    ),
  );
  assert.equal(button(recovered, "다음").props.disabled, true);
  nodes(recovered, (n) => n.type === "input")[0].props.onChange({
    target: { checked: true },
  });
  recovered = render();
  button(recovered, "다음").props.onClick();
  recovered = render();
  assert.equal(
    nodes(recovered, (n) => n.props?.placeholder === "예: dawn.code")[0].props
      .value,
    "new.maker",
  );
  assert.equal(
    nodes(recovered, (n) => n.props?.placeholder === "예: 새벽코딩")[0].props
      .value,
    "새내기",
  );
});

test("약관 조회 실패는 동의·다음을 막고 재시도로 복구한다", async (t) => {
  let attempts = 0;
  const wt = {
    go() {},
    takenHandles: [],
    signup() {
      assert.fail("동의 전에 제출됨");
    },
  };
  const h = harness({
    "@/api/auth/config": { realAuth: true },
    "@/api/auth/authApi": {
      fetchSession: async () => ({ status: "SIGNUP_PENDING" }),
      fetchCurrentPolicies: async () => {
        if (++attempts === 1) throw Error("offline");
        return policies("v2");
      },
      checkUsername: async () => true,
    },
    "@/providers/context": {
      useWt: () => wt,
    },
  });
  t.after(() => h.dispose());
  const { OnboardingScreen } = h.load(onboardingPath);
  const render = () => h.render(OnboardingScreen, { step: 1 });
  render();
  await settle();
  let tree = render();
  assert.equal(button(tree, "다음").props.disabled, true);
  assert.ok(
    nodes(tree, (n) => n.type === "input").every((n) => n.props.disabled),
  );
  await button(tree, "약관 다시 불러오기").props.onClick();
  await settle();
  tree = render();
  assert.ok(
    nodes(tree, (n) => n.type === "input").every((n) => !n.props.disabled),
  );
  assert.equal(button(tree, "다음").props.disabled, true);
});

test("설정 저장 후 서버의 링크 정렬·주소를 입력칸에도 반영한다", async (t) => {
  const me = {
    id: "member",
    handle: "maker",
    nick: "제작자",
    links: [],
    interests: [],
  };
  const saved = {
    ...me,
    links: [
      ["blog", "https://blog.example.com"],
      ["github", "https://github.com/maker"],
    ],
  };
  let writes = 0;
  const wt = {
    me,
    takenHandles: [],
    updateMe: async () => {
      writes++;
      wt.me = saved;
      return saved;
    },
  };
  const h = harness({
    "@/api/auth/config": { realAuth: true },
    "@/providers/context": { useWt: () => wt },
  });
  t.after(() => h.dispose());
  const { SettingsPanel } = h.load(
    "app/(main)/mypage/_components/SettingsPanel.tsx",
  );
  const render = () => h.render(SettingsPanel);
  let tree = render();
  button(tree, "링크 추가").props.onClick();
  tree = render();
  nodes(tree, (n) => n.props?.["aria-label"] === "링크 종류")[0].props.onChange(
    { target: { value: "github" } },
  );
  tree = render();
  nodes(tree, (n) => n.props?.["aria-label"] === "링크 주소")[0].props.onChange(
    { target: { value: "github.com/maker" } },
  );
  tree = render();
  button(tree, "링크 추가").props.onClick();
  tree = render();
  nodes(tree, (n) => n.props?.["aria-label"] === "링크 주소")[1].props.onChange(
    { target: { value: "blog.example.com" } },
  );
  tree = render();
  // 화면에 있는 저장 버튼을 찾아 실제 이벤트를 실행한다.
  const save = nodes(
    tree,
    (n) => n.type === "Button" && text(n).includes("저장"),
  )[0];
  assert.equal(save.props.disabled, false);
  await save.props.onClick();
  tree = render();
  assert.equal(writes, 1);
  assert.deepEqual(
    nodes(tree, (n) => n.props?.["aria-label"] === "링크 주소").map(
      (n) => n.props.value,
    ),
    saved.links.map((l) => l[1]),
  );
  assert.equal(
    nodes(tree, (n) => n.type === "Button" && text(n).includes("저장"))[0].props
      .disabled,
    true,
  );
});

test("프로필 링크는 모든 종류에서 보완한 https:// 포함 300자를 검사한다", () => {
  const h = harness();
  const { linkCheck } = h.load("domain/validation.ts");
  for (const kind of ["github", "instagram", "velog", "blog", "portfolio"]) {
    const base = {
      github: "github.com/maker/",
      instagram: "instagram.com/maker/",
      velog: "velog.io/@maker/",
      blog: "blog.example.com/",
      portfolio: "portfolio.example.com/",
    }[kind];
    const raw = base + "a".repeat(300 - "https://".length - base.length);
    assert.equal(linkCheck(kind, raw), null, kind);
    assert.match(linkCheck(kind, raw + "a"), /300자/, kind);
    assert.equal(linkCheck(kind, "https://" + raw), null, kind);
    assert.match(linkCheck(kind, "https://" + raw + "a"), /300자/, kind);
  }
});

async function provider(t, fetchSession, extra = {}) {
  const originalWindow = globalThis.window;
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    location: { pathname: "/", search: "" },
  };
  let h;
  t.after(() => {
    h?.dispose();
    globalThis.window = originalWindow;
  });
  const guest = {
    meId: null,
    likes: [],
    saves: [],
    reported: [],
    guestReviewed: [],
    aiUsed: 0,
    todayCount: 0,
  };
  const snap = {
    services: [],
    reviews: [],
    comments: [],
    notifications: [],
    takenHandles: [],
    users: { demo: { id: "demo", handle: "demo", nick: "데모" } },
    session: { ...guest, meId: "demo", likes: ["s1"], saves: ["s2"] },
  };
  h = harness({
    "next/navigation": { useRouter: () => ({ push() {}, replace() {} }) },
    "@/api": {
      createApi: () => ({
        adoptMember: async (u) => ({
          users: u ? { ...snap.users, [u.id]: u } : snap.users,
          session: u ? { ...guest, meId: u.id } : guest,
        }),
      }),
    },
    "@/api/auth/config": { realAuth: true },
    "@/api/auth/authApi": { fetchSession, ...extra },
    "./context": { WtCtx: { Provider: "WtCtx" } },
    "./RouteWatcher": { RouteWatcher: "RouteWatcher" },
  });
  const { WtProvider } = h.load("providers/WtProvider.tsx");
  const render = () => h.render(WtProvider, { snapshot: snap }).props.value;
  assert.equal(render().sessionReady, false);
  await settle();
  return { h, render };
}

for (const state of ["ANONYMOUS", "SIGNUP_PENDING", "NETWORK_FAILURE"]) {
  test(`서버 세션 ${state}: 남아 있던 목업 회원·좋아요·저장을 제거한다`, async (t) => {
    const { render } = await provider(t, async () => {
      if (state === "NETWORK_FAILURE") throw Error("offline");
      return { status: state };
    });
    const store = render();
    assert.equal(store.sessionReady, true);
    assert.equal(store.me, null);
    assert.equal(store.likes.size, 0);
    assert.equal(store.saves.size, 0);
  });
}

test("서버 세션 MEMBER: 서버가 알려 준 회원으로 로그인 상태를 복원한다", async (t) => {
  const { render } = await provider(
    t,
    async () => ({ status: "MEMBER", member: { id: "restored" } }),
    {
      memberToUser: (m) => ({ id: m.id, handle: "restored", nick: "복원" }),
    },
  );
  const store = render();
  assert.equal(store.sessionReady, true);
  assert.equal(store.me?.id, "restored");
  assert.equal(store.me?.nick, "복원");
});

test("가입 store는 약관 변경 오류 코드를 화면으로 전달하고 미동의 버전을 자동 조회하지 않는다", async (t) => {
  let writes = 0,
    loads = 0;
  let ErrorType;
  const extra = {
    submitSignup: async () => {
      writes++;
      throw new ErrorType("rule", "약관 변경", "USER_409_03");
    },
    fetchCurrentPolicies: async () => {
      loads++;
      return policies("v2");
    },
  };
  const p = await provider(
    t,
    async () => ({ status: "SIGNUP_PENDING" }),
    extra,
  );
  const { ApiError } = p.h.load("api/errors.ts");
  ErrorType = ApiError;
  assert.equal(
    await p.render().signup({
      handle: "maker",
      nick: "제작자",
      interests: [],
      consents: policies("v1"),
    }),
    "policyChanged",
  );
  assert.equal(writes, 1);
  assert.equal(
    await p.render().signup({ handle: "maker", nick: "제작자", interests: [] }),
    false,
  );
  assert.equal(writes, 1);
  assert.equal(loads, 0);
});

test("예전 Tweaks 회원 설정을 읽어도 비회원 목업으로 시작한다", (t) => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => JSON.stringify({ session: "member", cols: 3 }),
  };
  t.after(() => {
    globalThis.localStorage = previous;
  });
  const h = harness({ "@/api": { ME_ID: "demo" } });
  const { loadTweaks, mockOptions } = h.load("dev/tweaks/values.ts");
  const settings = loadTweaks();
  assert.equal("session" in settings, false);
  assert.equal(settings.cols, 3);
  assert.equal(mockOptions(settings).me, null);
});

test("HTTP 오류에서 약관 변경 코드를 보존한다", async (t) => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    json: async () => ({
      success: false,
      code: "USER_409_03",
      message: "약관 변경",
      data: null,
    }),
  });
  t.after(() => {
    globalThis.fetch = previous;
  });
  const h = harness({ "./config": { API_BASE: "http://unused.invalid" } });
  const { getJson } = h.load("api/auth/http.ts");
  await assert.rejects(
    getJson("/unused"),
    (error) => error.kind === "rule" && error.code === "USER_409_03",
  );
});

test("상태 변경 요청은 CSRF 헤더와 세션 쿠키를 함께 보낸다", async (t) => {
  const previous = globalThis.fetch;
  const calls = [];
  const ok = (data) => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, code: "OK", message: "", data }),
  });
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    return url.endsWith("/api/auth/csrf")
      ? ok({ headerName: "X-CSRF-TOKEN", token: "t" })
      : ok(null);
  };
  t.after(() => {
    globalThis.fetch = previous;
  });
  const h = harness({ "./config": { API_BASE: "http://unused.invalid" } });
  const { postJson, putJson, deleteJson } = h.load("api/auth/http.ts");
  await postJson("/api/auth/logout");
  await putJson("/api/users/me", { nickname: "a" });
  await deleteJson("/api/users/me");
  assert.deepEqual(
    calls
      .filter((c) => !c.url.endsWith("/api/auth/csrf"))
      .map((c) => c.init.method),
    ["POST", "PUT", "DELETE"],
  );
  for (const c of calls) assert.equal(c.init.credentials, "include");
  for (const c of calls.filter((c) => !c.url.endsWith("/api/auth/csrf")))
    assert.equal(c.init.headers["X-CSRF-TOKEN"], "t");
});

test("포트폴리오 링크도 형식을 검사한다(호스트 규칙은 없다)", () => {
  const h = harness();
  const { linkCheck } = h.load("domain/validation.ts");
  for (const ok of [
    "portfolio.example.com/me",
    "https://한글.example/포트폴리오",
    "https://localhost:3000",
  ])
    assert.equal(linkCheck("portfolio", ok), null, ok);
  for (const bad of [
    "user@portfolio.example.com",
    "https://user:pw@portfolio.example.com",
    "my site.example.com",
    "ftp://portfolio.example.com",
    "javascript:alert(1)",
  ])
    assert.match(linkCheck("portfolio", bad), /올바른 주소/, bad);
});
