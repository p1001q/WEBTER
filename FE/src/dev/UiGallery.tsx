"use client";

// 개발 전용: 토큰과 공용 UI 를 한 화면에 나열한다. 보관본의 같은 요소와 나란히 비교하는 데 쓴다.
// 프로덕션 빌드에는 들어가지 않는다(next.config.ts 의 pageExtensions, pnpm verify:prod).
// HEAD 블록만 보관본 사본과 다르고 나머지는 같은 내용이다.
// <<HEAD
import { useState } from "react";
import { IC, Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldMessage } from "@/components/ui/FieldMessage";
import { MakerBadge } from "@/components/ui/MakerBadge";
import { Modal } from "@/components/ui/Modal";
import { ScopeBadge } from "@/components/ui/ScopeBadge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { Toast } from "@/components/ui/Toast";
import { SEED_USERS } from "@/api/mock/seed";
import { pathFor, safeBackPath } from "@/lib/routes";
import { DEV_ONLY_MARKER } from "./marker";

const T = {
  c: (n: string) => `var(--color-${n})`,
  r: (n: string) => `var(--radius-${n})`,
  s: (n: string) => `var(--shadow-${n})`,
};
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div data-dev-marker={DEV_ONLY_MARKER} className="@container/app">
    {children}
  </div>
);
// HEAD>>

const COLORS = [
  "navy",
  "navy-700",
  "navy-100",
  "navy-50",
  "navy-25",
  "ink",
  "ivory",
  "butter",
  "butter-50",
  "butter-ink",
  "wine",
  "wine-700",
  "wine-100",
  "wine-50",
  "wine-25",
  "card",
  "border",
  "border-strong",
  "muted",
  "light",
  "text-2",
  "text-3",
  "placeholder",
  "scrim",
  "launch-bg",
  "focus",
  "grade-vpos-bg",
  "grade-pos-bg",
  "grade-mpos-bg",
  "grade-mixed-bg",
  "grade-mneg-bg",
  "grade-neg-bg",
  "grade-vneg-bg",
  "grade-few-bg",
  "status-live-bg",
  "status-stop-bg",
  "status-private-bg",
  "status-temp-bg",
];
const SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 22, 28, 34, 40];
const row: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "center",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 800 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function UiGallery() {
  const [tab, setTab] = useState("a");
  const [seg, setSeg] = useState("x");
  const [sw, setSw] = useState(true);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState<null | {
    msg: string;
    err?: boolean;
    action?: string;
  }>(null);
  return (
    <Frame>
      <div
        style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 120px" }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>UI 갤러리</h1>

        <Section title="색상 토큰">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
              gap: 10,
            }}
          >
            {COLORS.map((n) => (
              <div key={n} style={{ fontSize: 11 }}>
                <div
                  style={{
                    height: 40,
                    borderRadius: 6,
                    background: T.c(n),
                    border: "1px solid rgba(0,0,0,.08)",
                  }}
                />
                <div style={{ marginTop: 4 }}>{n}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="글자">
          {SIZES.map((s) => (
            <div
              key={s}
              style={{ fontSize: s, lineHeight: 1.4, overflowWrap: "anywhere" }}
            >
              {s}px 웹에서 놀다, 웹터 Aa 123{" "}
              <span style={{ fontFamily: "var(--font-mono, var(--wt-mono))" }}>
                https://example.com 1,284
              </span>
            </div>
          ))}
          <div style={{ marginTop: 8, fontWeight: 400 }}>
            400 가나다 · <b style={{ fontWeight: 500 }}>500 가나다</b> ·{" "}
            <b style={{ fontWeight: 600 }}>600 가나다</b> ·{" "}
            <b style={{ fontWeight: 700 }}>700 가나다</b> ·{" "}
            <b style={{ fontWeight: 800 }}>800 가나다</b>
          </div>
        </Section>

        <Section title="반경 · 그림자">
          <div style={row}>
            {["sm", "md", "lg", "pill"].map((r) => (
              <div
                key={r}
                style={{
                  width: 96,
                  height: 56,
                  background: T.c("card"),
                  border: `1px solid ${T.c("border")}`,
                  borderRadius: T.r(r),
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                }}
              >
                {r}
              </div>
            ))}
            {["card", "hover", "pop"].map((s) => (
              <div
                key={s}
                style={{
                  width: 96,
                  height: 56,
                  background: T.c("card"),
                  boxShadow: T.s(s),
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                }}
              >
                {s}
              </div>
            ))}
          </div>
        </Section>

        <Section title="아이콘">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
              gap: 10,
            }}
          >
            {Object.keys(IC).map((n) => (
              <div
                key={n}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: T.c("muted"),
                }}
              >
                <Icon name={n} size={22} />
                {n}
              </div>
            ))}
          </div>
          <div style={{ ...row, marginTop: 14 }}>
            <Icon name="heart" size={24} fill />
            <Icon name="bookmark" size={24} stroke={2.4} />
            <Icon name="search" size={16} />
            <Icon name="user" size={32} label="사용자" />
          </div>
        </Section>

        <Section title="Avatar · 배지">
          <div style={row}>
            <Avatar user={null} size={32} />
            <Avatar user={SEED_USERS.u_me} size={24} />
            <Avatar user={SEED_USERS.u_bori} size={32} />
            <Avatar user={SEED_USERS.u_mint} size={48} />
            <Avatar user={SEED_USERS.u_pixel} size={64} />
            <ScopeBadge />
            <MakerBadge />
          </div>
        </Section>

        <Section title="Tabs · SegmentedControl · Switch">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              ["a", "소개"],
              ["b", "리뷰", 12],
              ["c", "버전", 3],
            ]}
          />
          <div style={{ ...row, marginTop: 16 }}>
            <SegmentedControl
              value={seg}
              onChange={setSeg}
              label="예시"
              options={[
                ["x", "하나"],
                ["y", "둘"],
                ["z", "셋"],
              ]}
            />
            <Switch
              on={sw}
              onChange={setSw}
              label="공개"
              desc="누구나 볼 수 있어요"
            />
            <Switch on={false} onChange={() => {}} label="알림" />
            <Switch on disabled onChange={() => {}} label="비활성" />
          </div>
        </Section>

        <Section title="FieldMessage · EmptyState">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <FieldMessage state="err">이미 사용 중인 아이디예요.</FieldMessage>
            <FieldMessage state="ok">사용할 수 있어요.</FieldMessage>
            <FieldMessage state="idle">
              영문 소문자와 숫자, 점(.)만 쓸 수 있어요.
            </FieldMessage>
            <FieldMessage state="wait">확인하는 중이에요.</FieldMessage>
          </div>
          <div
            style={{
              background: T.c("card"),
              border: `1px solid ${T.c("border")}`,
              borderRadius: 8,
              marginTop: 16,
            }}
          >
            <EmptyState
              title="검색 결과가 없어요"
              desc="다른 검색어로 다시 찾아보세요."
              action="초기화"
              onAction={() => {}}
            />
          </div>
        </Section>

        <Section title="주소 생성 (lib/routes)">
          <div
            style={{
              fontFamily: "var(--font-mono, var(--wt-mono))",
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            <div>{pathFor("detail", { id: "s01", tab: "reviews" })}</div>
            <div>{pathFor("register")}</div>
            <div>{pathFor("login", { back: "/services/s01?tab=reviews" })}</div>
            <div>
              {String(safeBackPath("/mypage"))} ·{" "}
              {String(safeBackPath("//evil.example"))} ·{" "}
              {String(safeBackPath("https://evil.example"))}
            </div>
          </div>
        </Section>

        <Section title="오버레이">
          <div style={row}>
            <button
              type="button"
              onClick={() => setModal(true)}
              style={{
                height: 36,
                padding: "0 16px",
                border: "1px solid #ccc",
                borderRadius: 999,
                background: "#fff",
              }}
            >
              모달 열기
            </button>
            <button
              type="button"
              onClick={() =>
                setToast({
                  msg: "저장했어요. 마이페이지에서 다시 볼 수 있어요.",
                  action: "보기",
                })
              }
              style={{
                height: 36,
                padding: "0 16px",
                border: "1px solid #ccc",
                borderRadius: 999,
                background: "#fff",
              }}
            >
              토스트
            </button>
            <button
              type="button"
              onClick={() =>
                setToast({ msg: "링크를 복사하지 못했어요.", err: true })
              }
              style={{
                height: 36,
                padding: "0 16px",
                border: "1px solid #ccc",
                borderRadius: 999,
                background: "#fff",
              }}
            >
              오류 토스트
            </button>
          </div>
        </Section>
      </div>
      {modal && (
        <Modal onClose={() => setModal(false)} labelledBy="g-title">
          <div
            id="g-title"
            style={{ fontSize: 20, fontWeight: 800, paddingRight: 32 }}
          >
            모달 제목
          </div>
          <div style={{ marginTop: 8, fontSize: 14.5, color: "#555" }}>
            본문 내용이 들어갑니다. Esc 나 배경을 눌러 닫을 수 있어요.
          </div>
        </Modal>
      )}
      <Toast toast={toast} />
    </Frame>
  );
}
