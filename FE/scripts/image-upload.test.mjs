import assert from "node:assert/strict";
import { test } from "node:test";
import { harness } from "./helpers/uiHarness.mjs";

const posts = [];
let ticketFor = (n) => ({
  uploadUrl: `https://storage.example.test/put/${n}`,
  method: "PUT",
  headers: { "Content-Type": "image/png" },
  imageUrl: `https://cdn.example.test/uploads/${n}.png`,
});
const h = harness({
  "../errors": {
    ApiError: class ApiError extends Error {
      constructor(kind, message) {
        super(message ?? kind);
        this.kind = kind;
      }
    },
  },
  "../auth/http": {
    postJson: async (path, body) => {
      posts.push([path, body]);
      return ticketFor(posts.length);
    },
  },
});
const { uploadDataUrl, resolveImages } = h.load("api/real/imageUpload.ts");

const realFetch = globalThis.fetch;
const puts = [];
test.afterEach(() => {
  globalThis.fetch = realFetch;
  posts.length = 0;
  puts.length = 0;
});
const stubFetch = (putStatus = 200) => {
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith("data:")) {
      return { blob: async () => new Blob(["PNGDATA"], { type: "image/png" }) };
    }
    puts.push([String(url), init]);
    return { ok: putStatus < 300, status: putStatus };
  };
};

test("고른 이미지는 발급받은 주소로 직접 올리고 서버 주소를 돌려준다", async () => {
  stubFetch();
  const url = await uploadDataUrl("data:image/png;base64,UE5H");
  assert.equal(url, "https://cdn.example.test/uploads/1.png");
  assert.deepEqual(posts[0], [
    "/api/uploads/images",
    { contentType: "image/png", size: 7 },
  ]);
  assert.equal(puts[0][0], "https://storage.example.test/put/1");
  assert.equal(puts[0][1].method, "PUT");
  assert.deepEqual(puts[0][1].headers, { "Content-Type": "image/png" });
  // 저장소에는 로그인 쿠키를 보내지 않는다
  assert.equal(puts[0][1].credentials, "omit");
});

test("저장소가 거절하면 오류로 알린다", async () => {
  stubFetch(403);
  await assert.rejects(() => uploadDataUrl("data:image/png;base64,UE5H"), {
    kind: "rule",
  });
});

test("브라우저에서 고른 이미지만 올리고 이미 서버에 있는 주소는 그대로 둔다", async () => {
  const uploaded = [];
  const upload = async (v) => {
    uploaded.push(v);
    return `https://cdn.example.test/uploads/${uploaded.length}.png`;
  };
  const out = await resolveImages(
    {
      iconImg: "data:image/png;base64,AAA",
      thumbImg: "https://cdn.example.test/uploads/old-thumb.png",
      previews: {
        ratio: "land",
        imgs: [
          "https://cdn.example.test/uploads/old-p.png",
          "data:image/png;base64,BBB",
        ],
      },
    },
    upload,
  );
  assert.deepEqual(uploaded, [
    "data:image/png;base64,AAA",
    "data:image/png;base64,BBB",
  ]);
  assert.equal(out.iconImg, "https://cdn.example.test/uploads/1.png");
  assert.equal(out.thumbImg, "https://cdn.example.test/uploads/old-thumb.png");
  assert.deepEqual(out.previews.imgs, [
    "https://cdn.example.test/uploads/old-p.png",
    "https://cdn.example.test/uploads/2.png",
  ]);
  assert.equal(out.previews.ratio, "land");
});

test("이미지가 없으면 그대로 두고 올리기를 시도하지 않는다", async () => {
  const out = await resolveImages(
    { iconImg: null, thumbImg: undefined, previews: null },
    async () => assert.fail("올리면 안 된다"),
  );
  assert.equal(out.iconImg, null);
  assert.equal(out.thumbImg, null);
  assert.equal(out.previews, null);
});
