import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { harness } from "./helpers/uiHarness.mjs";

process.env.API_INTERNAL_BASE_URL = "http://be.test";
process.env.NEXT_PUBLIC_API_BASE_URL = "http://be.test";
const h = harness();
const { fetchServiceMeta, serviceMetadata } = h.load("api/real/serviceMeta.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const serve = (status, data) => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return {
      ok: status < 400,
      json: async () => ({ success: status < 400, data }),
    };
  };
  return calls;
};

const pub = {
  name: "타이머",
  tagline: "집중 시간을 재요",
  thumbnailUrl: "https://cdn.test/t.png",
  iconUrl: "https://cdn.test/i.png",
  visibility: "PUBLIC",
};

test("공개 서비스의 이름·소개·썸네일을 읽는다", async () => {
  const calls = serve(200, pub);
  const meta = await fetchServiceMeta("12");
  assert.deepEqual(meta, {
    name: "타이머",
    tagline: "집중 시간을 재요",
    image: "https://cdn.test/t.png",
  });
  assert.equal(calls[0], "http://be.test/api/services/12");
});

test("썸네일이 없으면 아이콘을, 절대 주소가 아니면 이미지를 쓰지 않는다", async () => {
  serve(200, { ...pub, thumbnailUrl: null });
  assert.equal((await fetchServiceMeta("12")).image, "https://cdn.test/i.png");
  serve(200, { ...pub, thumbnailUrl: "/local.png", iconUrl: null });
  assert.equal((await fetchServiceMeta("12")).image, null);
});

test("공개가 아니거나 서버가 거절하거나 숫자 id가 아니면 값을 주지 않는다", async () => {
  serve(200, { ...pub, visibility: "TEMP_HIDDEN" });
  assert.equal(await fetchServiceMeta("12"), null);
  serve(404, null);
  assert.equal(await fetchServiceMeta("12"), null);
  const calls = serve(200, pub);
  assert.equal(await fetchServiceMeta("12/../auth"), null);
  assert.equal(calls.length, 0);
});

test("서버에 닿지 않아도 오류를 던지지 않는다", async () => {
  globalThis.fetch = async () => {
    throw new Error("down");
  };
  assert.equal(await fetchServiceMeta("12"), null);
});

test("OG와 트위터 카드에 이름·소개·이미지를 담는다", () => {
  const m = serviceMetadata("12", {
    name: "타이머",
    tagline: "집중 시간을 재요",
    image: "https://cdn.test/t.png",
  });
  assert.equal(m.title, "타이머");
  assert.equal(m.description, "집중 시간을 재요");
  assert.equal(m.openGraph.title, "타이머");
  assert.deepEqual(m.openGraph.images, [{ url: "https://cdn.test/t.png" }]);
  assert.equal(m.twitter.card, "summary_large_image");
  const bare = serviceMetadata("12", { name: "a", tagline: "b", image: null });
  assert.equal(bare.openGraph.images, undefined);
  assert.equal(bare.twitter.card, "summary");
});
