import assert from "node:assert/strict";
import { test } from "node:test";
import { harness } from "./helpers/uiHarness.mjs";

const calls = [];
const respond = { value: {} };
const h = harness({
  // 이미지 올리기는 image-upload.test.mjs에서 확인한다. 여기서는 그대로 통과시킨다
  "./imageUpload": { resolveImages: async (s) => s },
  "../auth/http": {
    getJson: async (path) => {
      calls.push(["GET", path]);
      return respond.value;
    },
    postJson: async (path, body) => {
      calls.push(["POST", path, body]);
      return respond.value;
    },
    putJson: async (path, body) => {
      calls.push(["PUT", path, body]);
      return respond.value;
    },
    deleteJson: async (path) => {
      calls.push(["DELETE", path]);
      return null;
    },
  },
});
const { toServiceRequest, toVersionRequests, withRealServices } = h.load(
  "api/real/serviceActions.ts",
);

const service = (over = {}) => ({
  id: "7",
  name: "타이머",
  tagline: "집중 타이머",
  desc: "소개",
  url: "https://timer.example.test",
  owner: "u-1",
  created: "2026-11-10",
  cats: ["prod", "util"],
  type: "pro",
  devices: ["pc", "mobile"],
  price: "partial",
  team: null,
  langs: ["ko", "en"],
  tags: ["집중"],
  github: null,
  use: "live",
  stopReason: "",
  pub: "public",
  pubReason: "",
  hasIcon: false,
  hasThumb: false,
  iconImg: "blob:http://localhost/abc",
  thumbImg: "https://img.example.test/t.png",
  previews: {
    ratio: "port",
    fit: "contain",
    count: 2,
    imgs: ["data:image/png;base64,AAA", "https://img.example.test/p.png"],
  },
  allowGuest: true,
  allowAnon: false,
  allowAnonComment: true,
  versions: [],
  ...over,
});

test("서비스 값을 등록 요청으로 바꾼다(코드값·이미지 주소 걸러내기)", () => {
  const r = toServiceRequest(service());
  assert.deepEqual(r.categories, ["PRODUCTIVITY", "UTILITY"]);
  assert.equal(r.projectType, "COMMERCIAL");
  assert.equal(r.priceType, "FREEMIUM");
  assert.deepEqual(r.devices, ["PC", "MOBILE"]);
  assert.deepEqual(r.languages, ["KO", "EN"]);
  // 브라우저에서 고른 파일의 임시 주소는 보내지 않는다
  assert.equal(r.iconUrl, null);
  assert.equal(r.thumbnailUrl, "https://img.example.test/t.png");
  assert.deepEqual(r.previewImages, ["https://img.example.test/p.png"]);
  assert.equal(r.previewRatio, "PORTRAIT");
  assert.equal(r.previewFit, "CONTAIN");
  assert.equal(r.teamName, null);
  assert.equal(r.allowGuestReviews, true);
  assert.equal(r.allowAnonymousComments, true);
  assert.equal(r.agreeRegistration, true);
});

test("버전 기록은 서버에 있는 기록(숫자 id)만 id를 보낸다", () => {
  const out = toVersionRequests([
    { id: "12", ver: "v1", title: "t", body: "b", date: "2026-11-10" },
    { id: "v1731234", ver: "v2", title: "t2", body: "b2", date: "2026-11-10" },
  ]);
  assert.deepEqual(out, [
    { id: "12", version: "v1", title: "t", content: "b" },
    { id: null, version: "v2", title: "t2", content: "b2" },
  ]);
});

const backend = {
  id: "7",
  name: "타이머",
  tagline: "t",
  description: null,
  url: "https://timer.example.test",
  githubUrl: null,
  owner: { id: "u-1", username: "m", nickname: "n" },
  members: [],
  createdAt: "2026-11-10T00:00:00Z",
  categories: [],
  tags: [],
  projectType: "SIDE",
  devices: ["PC"],
  priceType: "FREE",
  registrantType: "INDIVIDUAL",
  teamName: null,
  languages: ["KO"],
  availability: "UNAVAILABLE",
  unavailableReason: "점검 중",
  visibility: "PUBLIC",
  hiddenReason: null,
  iconUrl: null,
  thumbnailUrl: null,
  previewRatio: "LANDSCAPE",
  previewFit: "COVER",
  previewImages: [],
  allowGuestReviews: false,
  allowAnonymousReviews: false,
  allowAnonymousComments: false,
  views: 0,
  clicks: 0,
  likes: 0,
  saves: 0,
  reviews: { up: 0, down: 0, none: 0 },
  scores: { threeDays: 0, week: 0, month: 0 },
  versions: [],
};

const api = withRealServices({ createService: null });

test("운영 상태 변경은 availability API로 보낸다", async () => {
  calls.length = 0;
  respond.value = backend;
  const s = await api.updateService("7", {
    use: "stop",
    stopReason: "점검 중",
  });
  assert.deepEqual(calls, [
    [
      "PUT",
      "/api/services/7/availability",
      { status: "UNAVAILABLE", reason: "점검 중" },
    ],
  ]);
  assert.equal(s.use, "stop");
  calls.length = 0;
  await api.updateService("7", { use: "live", stopReason: "" });
  assert.deepEqual(calls[0][2], { status: "AVAILABLE", reason: null });
});

test("버전 기록 변경은 versions API로 보낸다", async () => {
  calls.length = 0;
  respond.value = backend;
  await api.updateService("7", {
    versions: [{ id: "v99", ver: "v1", title: "t", body: "b", date: "x" }],
  });
  assert.equal(calls[0][1], "/api/services/7/versions");
  assert.deepEqual(calls[0][2], [
    { id: null, version: "v1", title: "t", content: "b" },
  ]);
});

test("등록 항목 수정은 현재 값에 덮어 전체를 보낸다", async () => {
  calls.length = 0;
  respond.value = backend;
  await api.updateService("7", { name: "새 이름" });
  assert.deepEqual(calls[0], ["GET", "/api/services/7"]);
  assert.equal(calls[1][0], "PUT");
  assert.equal(calls[1][1], "/api/services/7");
  assert.equal(calls[1][2].name, "새 이름");
  assert.deepEqual(calls[1][2].devices, ["PC"]);
});

test("서비스 등록·삭제와 주소 검사 결과를 화면 값으로 바꾼다", async () => {
  calls.length = 0;
  respond.value = backend;
  const created = await api.createService(service());
  assert.equal(created.id, "7");
  assert.deepEqual(calls[0].slice(0, 2), ["POST", "/api/services"]);
  await api.deleteService("7");
  assert.deepEqual(calls.at(-1), ["DELETE", "/api/services/7"]);
  respond.value = { state: "DUPLICATE", message: "중복" };
  assert.deepEqual(await api.checkServiceUrl("https://a.example.test", "7"), {
    state: "dup",
    msg: "중복",
  });
  assert.deepEqual(calls.at(-1)[2], {
    url: "https://a.example.test",
    selfId: 7,
  });
  respond.value = { state: "OK", message: "확인" };
  assert.equal(
    (await api.checkServiceUrl("https://b.example.test")).state,
    "ok",
  );
  assert.equal(calls.at(-1)[2].selfId, null);
});
