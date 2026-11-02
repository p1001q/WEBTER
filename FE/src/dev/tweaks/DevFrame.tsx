"use client";

// 개발 전용: provider 를 감싸 세션·샘플·화면 폭·열 수를 바꾸는 데모 컨트롤(Tweaks)을 붙인다.
// AppFrame 이 NODE_ENV 가 development 일 때만 불러오므로 프로덕션 빌드에는 들어가지 않는다(pnpm verify:prod).
// 배포 전에 지우려면 src/dev/tweaks 폴더와 AppFrame 의 개발 분기만 없애면 된다.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createApi } from "@/api";
import type { Snapshot } from "@/api/types";
import { pathFor } from "@/lib/routes";
import { WtProvider } from "@/providers/WtProvider";
import { DEV_ONLY_MARKER } from "../marker";
import { Tweaks } from "./Tweaks";
import "./tweaks.css";
import {
  DEFAULT_TWEAKS,
  loadTweaks,
  mockOptions,
  saveTweaks,
  type TweakValues,
} from "./values";

const here = () => window.location.pathname + window.location.search;

export function DevFrame({
  snapshot,
  children,
}: {
  snapshot: Snapshot;
  children: ReactNode;
}) {
  const router = useRouter();
  const [t, setT] = useState<TweakValues>(DEFAULT_TWEAKS);
  // 렌더링 사이에 값이 연달아 바뀌어도 이전 값을 덮어쓰지 않게 최신 값을 따로 쥔다
  const latest = useRef(t);
  const [snap, setSnap] = useState(snapshot);
  const [nonce, setNonce] = useState(0);
  // 모바일 미리보기는 같은 앱을 390px iframe 으로 띄운다. iframe 안의 앱은 컨트롤 없이 같은 설정으로 시작한다
  const [embedded, setEmbedded] = useState(false);
  const [frame, setFrame] = useState({ path: "/", n: 0 });
  const frameRef = useRef<HTMLIFrameElement>(null);

  const rebuild = async (next: TweakValues) => {
    const s = await createApi(mockOptions(next)).bootstrap();
    setSnap(s);
    setNonce((n) => n + 1);
  };

  useEffect(() => {
    const stored = loadTweaks();
    /* eslint-disable react-hooks/set-state-in-effect -- 저장된 설정은 마운트 뒤에만 읽을 수 있다(서버 렌더링과 어긋나지 않게) */
    setEmbedded(window.self !== window.top);
    setT(stored);
    latest.current = stored;
    setFrame({ path: here(), n: 0 });
    /* eslint-enable react-hooks/set-state-in-effect */
    if (stored.session !== "guest" || stored.sample !== "default")
      void rebuild(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.twCols = String(t.cols);
    root.dataset.twScope = t.scope ? "show" : "hide";
    return () => {
      delete root.dataset.twCols;
      delete root.dataset.twScope;
    };
  }, [t.cols, t.scope]);

  const go = (path: string, mobile: boolean) => {
    if (mobile) setFrame((f) => ({ path, n: f.n + 1 }));
    else router.push(path);
  };

  /** 값을 바꾼다. 세션·샘플이 바뀌면 목업 DB 를 새로 만들고, path 가 있으면 새 상태가 적용된 뒤에 이동한다 */
  const change = async (patch: Partial<TweakValues>, path?: string) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    saveTweaks(next);
    if ("session" in patch || "sample" in patch) await rebuild(next);
    setT(next);
    const mobile = next.viewport === "mobile";
    if (patch.viewport === "mobile")
      setFrame((f) => ({ path: path ?? here(), n: f.n + 1 }));
    else if (patch.viewport === "desktop") {
      // 모바일에서 보던 화면을 이어서 연다
      const loc = frameRef.current?.contentWindow?.location;
      const target = path ?? (loc ? loc.pathname + loc.search : here());
      if (target !== here()) router.push(target);
    } else if (path) go(path, mobile);
    else if (mobile && ("session" in patch || "sample" in patch))
      // 같은 출처라 iframe 이 보던 주소 그대로 다시 불러온다(새 설정은 저장돼 있다)
      frameRef.current?.contentWindow?.location.reload();
  };

  if (embedded)
    return (
      <WtProvider key={nonce} snapshot={snap}>
        {children}
      </WtProvider>
    );

  const mobile = t.viewport === "mobile";
  return (
    <>
      <i hidden data-dev-marker={DEV_ONLY_MARKER} />
      {mobile ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#E9E6DE] py-6">
          <iframe
            ref={frameRef}
            key={frame.n}
            title="모바일 미리보기"
            src={frame.path}
            className="h-[min(864px,calc(100vh-60px))] w-[410px] rounded-[36px] border-[10px] border-ink bg-ivory"
          />
          <span className="font-mono text-11 text-muted">
            390 × 844 · 모바일 미리보기
          </span>
        </div>
      ) : (
        <WtProvider key={nonce} snapshot={snap}>
          {children}
        </WtProvider>
      )}
      <Tweaks
        t={t}
        onChange={(patch) =>
          void change(
            patch,
            patch.session === "signup"
              ? pathFor("login", { back: pathFor("detail", { id: "s01" }) })
              : undefined,
          )
        }
        onJump={(path, memberOnly) =>
          void change(
            memberOnly && latest.current.session !== "member"
              ? { session: "member" }
              : {},
            path,
          )
        }
        onReset={() => {
          void rebuild(t);
          go("/", mobile);
        }}
      />
    </>
  );
}
