import assert from "node:assert/strict";
import { test } from "node:test";
import { harness } from "./helpers/uiHarness.mjs";

const { makersOf, mapService, ownerToUser, ymd } = harness().load(
  "api/real/serviceApi.ts",
);

const backend = (over = {}) => ({
  id: "7",
  name: "타이머",
  tagline: "집중 타이머",
  description: "## 소개",
  url: "https://timer.example.test",
  githubUrl: null,
  owner: { id: "u-1", username: "maker_one", nickname: "제작자" },
  members: [{ id: "u-2", username: "maker_two", nickname: "팀원" }],
  createdAt: "2026-11-09T16:30:00Z",
  categories: ["PRODUCTIVITY", "UTILITY"],
  tags: ["타이머"],
  projectType: "COMMERCIAL",
  devices: ["PC", "MOBILE"],
  priceType: "FREEMIUM",
  registrantType: "TEAM",
  teamName: "얼렁뚱땅",
  languages: ["KO", "EN"],
  availability: "UNAVAILABLE",
  unavailableReason: "점검 중",
  visibility: "TEMP_HIDDEN",
  hiddenReason: "신고 누적",
  iconUrl: null,
  thumbnailUrl: null,
  previewRatio: "PORTRAIT",
  previewFit: "CONTAIN",
  previewImages: [],
  allowGuestReviews: true,
  allowAnonymousReviews: false,
  allowAnonymousComments: true,
  views: 10,
  clicks: 4,
  likes: 3,
  saves: 2,
  reviews: { up: 5, down: 1, none: 2 },
  scores: { threeDays: 6, week: 9, month: 12 },
  versions: [
    {
      id: "3",
      version: "v1.0",
      title: "첫 공개",
      content: "내용",
      createdAt: "2026-11-09T16:30:00Z",
    },
  ],
  ...over,
});

test("서버 서비스를 화면용 서비스로 바꾼다(코드값·집계·상태)", () => {
  const s = mapService(backend());
  assert.equal(s.id, "7");
  assert.equal(s.owner, "u-1");
  assert.deepEqual(s.members, ["u-2"]);
  assert.deepEqual(s.cats, ["prod", "util"]);
  assert.equal(s.type, "pro");
  assert.equal(s.price, "partial");
  assert.deepEqual(s.devices, ["pc", "mobile"]);
  assert.deepEqual(s.langs, ["ko", "en"]);
  assert.equal(s.team, "얼렁뚱땅");
  assert.equal(s.use, "stop");
  assert.equal(s.stopReason, "점검 중");
  assert.equal(s.pub, "temp");
  assert.equal(s.pubReason, "신고 누적");
  assert.deepEqual(s.rv, { up: 5, down: 1, none: 2 });
  assert.deepEqual(s.sc, [6, 9, 12]);
  assert.equal(s.allowGuest, true);
  assert.equal(s.allowAnon, false);
  assert.equal(s.allowAnonComment, true);
  assert.deepEqual(s.versions, [
    {
      id: "3",
      ver: "v1.0",
      title: "첫 공개",
      body: "내용",
      date: "2026-11-10",
    },
  ]);
});

test("날짜는 한국 시간 기준이다", () => {
  assert.equal(ymd("2026-11-09T16:30:00Z"), "2026-11-10");
  assert.equal(ymd("2026-11-09T14:59:59Z"), "2026-11-09");
});

test("개인 등록은 team이 null이고 이미지가 없으면 용도별 대표 그림을 쓴다", () => {
  const s = mapService(
    backend({ registrantType: "INDIVIDUAL", teamName: null }),
  );
  assert.equal(s.team, null);
  assert.equal(s.hasIcon, false);
  assert.equal(s.hasThumb, false);
  assert.equal(s.previews, null);
  assert.equal(s.thumb.kind, "default");
});

test("이미지가 있으면 주소와 미리보기 설정을 옮긴다", () => {
  const s = mapService(
    backend({
      iconUrl: "https://img.example.test/i.png",
      thumbnailUrl: "https://img.example.test/t.png",
      previewImages: [
        "https://img.example.test/p1.png",
        "https://img.example.test/p2.png",
      ],
    }),
  );
  assert.equal(s.hasIcon, true);
  assert.equal(s.hasThumb, true);
  assert.equal(s.iconImg, "https://img.example.test/i.png");
  assert.deepEqual(s.previews, {
    ratio: "port",
    fit: "contain",
    count: 2,
    imgs: [
      "https://img.example.test/p1.png",
      "https://img.example.test/p2.png",
    ],
  });
});

test("알 수 없는 카테고리 코드는 건너뛰고 설명이 없으면 빈 문자열이다", () => {
  const s = mapService(
    backend({ categories: ["UNKNOWN", "PLAY"], description: null }),
  );
  assert.deepEqual(s.cats, ["play"]);
  assert.equal(s.desc, "");
});

test("제작자는 공개 항목만 담는다", () => {
  const u = ownerToUser(backend());
  assert.deepEqual(u, {
    id: "u-1",
    nick: "제작자",
    handle: "maker_one",
    color: "#E3E8F0",
    bio: "",
    links: [],
  });
});

test("등록자와 팀원 모두를 제작자 회원 정보로 바꾼다", () => {
  const makers = makersOf(backend());
  assert.deepEqual(
    makers.map((u) => [u.id, u.handle, u.nick]),
    [
      ["u-1", "maker_one", "제작자"],
      ["u-2", "maker_two", "팀원"],
    ],
  );
});
