"use client";

// 개발 전용: 앱 셸·서비스 카드·모달·토스트를 한 화면에 모아 보관본과 나란히 비교한다.
// 프로덕션 빌드에는 들어가지 않는다(next.config.ts 의 pageExtensions, pnpm verify:prod).
// HEAD 블록만 보관본 사본과 다르고 나머지는 같은 내용이다.
// <<HEAD
import { Footer } from "@/components/layout/Footer";
import { SearchBar } from "@/components/layout/SearchBar";
import { SectionHead } from "@/components/layout/SectionHead";
import { ServiceCard } from "@/components/service/ServiceCard";
import { ServiceList } from "@/components/service/ServiceList";
import { useWt } from "@/providers/context";
import { DEV_ONLY_MARKER } from "./marker";

const WRAP = "page-wrap";
const curPath = (wt: ReturnType<typeof useWt>) => wt.currentPath();
const Marker = () => <i hidden data-dev-marker={DEV_ONLY_MARKER} />;
// HEAD>>

const btn: React.CSSProperties = {
  height: 32,
  padding: "0 14px",
  border: "1px solid #ccc",
  borderRadius: 999,
  background: "#fff",
  fontSize: 13,
};

export function ShellDemo() {
  const wt = useWt();
  const pub = wt.publicServices;
  const down = pub.find((s) => s.use === "stop");
  const first = pub[0];
  return (
    <div data-demo="">
      <Marker />
      <div className={WRAP} style={{ paddingTop: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>셸 검증</h1>
        <div
          data-state=""
          style={{ marginTop: 8, fontSize: 13, color: "#555" }}
        >
          me: {wt.me?.nick ?? "비회원"} · 좋아요 {wt.likes.size} · 저장{" "}
          {wt.saves.size} · side {String(wt.side)} · modal{" "}
          {wt.modal?.type ?? "-"} · isMobile {String(wt.isMobile)}
        </div>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}
        >
          <button style={btn} onClick={() => wt.login(curPath(wt))}>
            로그인(mock)
          </button>
          <button style={btn} onClick={() => wt.logout()}>
            로그아웃
          </button>
          <button
            style={btn}
            onClick={() =>
              wt.setModal({ type: "login", reason: "예시 사유예요." })
            }
          >
            로그인 모달
          </button>
          <button
            style={btn}
            onClick={() =>
              wt.setModal({
                type: "report",
                target: {
                  type: "service",
                  key: "service:s01",
                  label: first?.name,
                },
              })
            }
          >
            신고 모달
          </button>
          <button
            style={btn}
            onClick={() =>
              first && wt.setModal({ type: "delete", sid: first.id })
            }
          >
            삭제 모달
          </button>
          <button
            style={btn}
            onClick={() =>
              first && wt.setModal({ type: "stop", sid: first.id })
            }
          >
            사용 불가 모달
          </button>
          <button style={btn} onClick={() => wt.setModal({ type: "withdraw" })}>
            탈퇴 모달
          </button>
          <button
            style={btn}
            onClick={() =>
              wt.toast("저장했어요. 마이페이지에서 다시 볼 수 있어요.", {
                action: "보기",
              })
            }
          >
            토스트
          </button>
          <button
            style={btn}
            onClick={() => wt.toast("링크를 복사하지 못했어요.", { err: true })}
          >
            오류 토스트
          </button>
          <button style={btn} onClick={() => first && wt.toggleLike(first.id)}>
            첫 서비스 좋아요
          </button>
        </div>
        <div style={{ marginTop: 24 }}>
          <SearchBar />
        </div>
        <div style={{ marginTop: 16 }}>
          <SearchBar size="sm" initial="공부 시간" />
        </div>
        <div style={{ marginTop: 32 }}>
          <SectionHead
            title="지금 뜨는 서비스"
            sub="최근 3일 반응 기준"
            onMore={() => wt.toast("더보기")}
          />
        </div>
        <h2 style={{ margin: "32px 0 16px", fontSize: 22, fontWeight: 800 }}>
          카드형
        </h2>
        <ServiceList items={pub.slice(0, 4)} rankStart={1} />
        <h2 style={{ margin: "32px 0 16px", fontSize: 22, fontWeight: 800 }}>
          카드형 · 사용 불가 · hover
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 320px))",
            gap: 24,
          }}
        >
          {down && <ServiceCard s={down} />}
          {first && (
            <ServiceCard s={first} hover reason="친구와 바로 즐길 수 있어요" />
          )}
        </div>
        <h2 style={{ margin: "32px 0 16px", fontSize: 22, fontWeight: 800 }}>
          목록형
        </h2>
        <ServiceList
          view="list"
          items={pub.slice(4, 8)}
          rankStart={1}
          reasons={
            first && pub[4] ? { [pub[4].id]: "공부 시간을 관리해 줘요" } : null
          }
        />
      </div>
      <Footer />
    </div>
  );
}
