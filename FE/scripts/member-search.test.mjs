import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deferred,
  harness,
  nodes,
  settle,
  text,
} from "./helpers/uiHarness.mjs";

const user = (id, nick = "바다") => ({
  id,
  nick,
  handle: id,
  color: "#E3E8F0",
  bio: "소개",
  links: [],
});

test("회원 검색은 @·대소문자를 무시하고 같은 닉네임도 아이디별로 찾는다", () => {
  const h = harness();
  const { memberKeywordSearch } = h.load("domain/memberSearch.ts");
  const users = [
    user("a_maker"),
    user("maker_more"),
    user("maker"),
    { ...user("maker_hidden"), profileModerated: true },
  ];
  assert.deepEqual(
    memberKeywordSearch(users, " @MAKER ").map((u) => u.id),
    ["maker", "maker_more", "a_maker"],
  );
  assert.equal(memberKeywordSearch(users, "바다").length, 3);
  assert.equal(memberKeywordSearch(users, "@").length, 0);
  assert.equal(memberKeywordSearch(users, "%").length, 0);
});

test("회원 검색 API는 검색어를 인코딩하고 페이지 및 공개 요약을 변환한다", async () => {
  let path;
  const h = harness({
    "../auth/http": {
      getJson: async (p) => {
        path = p;
        return {
          items: [
            {
              id: "u1",
              username: "maker",
              nickname: "제작자",
              avatarUrl: null,
              bio: null,
            },
          ],
          page: 1,
          size: 20,
          total: 21,
        };
      },
    },
  });
  const { searchMembers } = h.load("api/real/memberSearchApi.ts");
  const result = await searchMembers("@바다&maker", 1);
  const params = new URL(path, "https://example.test").searchParams;
  assert.equal(params.get("q"), "@바다&maker");
  assert.equal(params.get("page"), "1");
  assert.equal(result.items[0].handle, "maker");
  assert.equal(result.items[0].nick, "제작자");
  assert.equal(result.items[0].bio, "");
  assert.equal(result.total, 21);
});

test("회원 결과에는 아이디·닉네임을 표시하고 선택하면 해당 프로필로 이동한다", async (t) => {
  const h = harness({
    "@/api/auth/config": { realAuth: true },
    "@/providers/context": { useWt: () => ({ users: {} }) },
    "@/api/real/memberSearchApi": {
      searchMembers: async () => ({
        items: [user("maker")],
        total: 1,
        size: 20,
        page: 0,
      }),
    },
  });
  t.after(() => h.dispose());
  const { MemberPage } = h.load(
    "app/(main)/search/_components/MemberResults.tsx",
  );
  const props = { q: "maker", page: 0, retry() {}, onPage() {} };
  assert.match(text(h.render(MemberPage, props)), /검색하고 있어요/);
  await settle();
  const tree = h.render(MemberPage, props);
  assert.match(text(tree), /바다@maker/);
  const link = nodes(tree, (n) => n.type === "RouteLink")[0];
  assert.equal(link.props.to, "profile");
  assert.deepEqual(link.props.params, { id: "maker" });
});

test("회원 검색 실패는 빈 결과와 구분하고 다시 시도할 수 있다", async (t) => {
  let retries = 0;
  const h = harness({
    "@/api/auth/config": { realAuth: true },
    "@/providers/context": { useWt: () => ({ users: {} }) },
    "@/api/real/memberSearchApi": {
      searchMembers: async () => {
        throw new Error("network");
      },
    },
  });
  t.after(() => h.dispose());
  const { MemberPage } = h.load(
    "app/(main)/search/_components/MemberResults.tsx",
  );
  const props = {
    q: "maker",
    page: 0,
    retry() {
      retries++;
    },
    onPage() {},
  };
  h.render(MemberPage, props);
  await settle();
  const tree = h.render(MemberPage, props);
  assert.match(text(tree), /불러오지 못했어요/);
  nodes(tree, (n) => n.type === "Button")[0].props.onClick();
  assert.equal(retries, 1);
});

test("회원 결과 페이지를 바꾸면 이전 요청의 늦은 응답은 버린다", async (t) => {
  const first = deferred();
  const h = harness({
    "@/api/auth/config": { realAuth: true },
    "@/providers/context": { useWt: () => ({ users: {} }) },
    "@/api/real/memberSearchApi": {
      searchMembers: async (_q, page) =>
        page === 0
          ? first.promise
          : { items: [user("second")], total: 21, size: 20, page: 1 },
    },
  });
  t.after(() => h.dispose());
  const { MemberPage } = h.load(
    "app/(main)/search/_components/MemberResults.tsx",
  );
  let selected;
  const props = {
    q: "maker",
    page: 0,
    retry() {},
    onPage(p) {
      selected = p;
    },
  };
  h.render(MemberPage, props);
  h.render(MemberPage, { ...props, page: 1 });
  await settle();
  first.resolve({ items: [user("old")], total: 21, size: 20, page: 0 });
  await settle();
  const tree = h.render(MemberPage, { ...props, page: 1 });
  assert.match(text(tree), /@second/);
  assert.doesNotMatch(text(tree), /@old/);
  const [prev, next] = nodes(tree, (n) => n.type === "Button");
  assert.equal(next.props.disabled, true);
  prev.props.onClick();
  assert.equal(selected, 0);
});
