import type { ReactNode } from "react";
import { loadSnapshot } from "@/api";
import { WtProvider } from "@/providers/WtProvider";
import { AppShell } from "./AppShell";

/**
 * 상태 provider 와 앱 셸을 서버에서 조립한다. `(main)/layout` 과 `not-found` 가 같이 쓴다.
 * 초기 데이터는 서버에서 받아 provider 에 넘기므로 서버와 클라이언트가 같은 값으로 시작한다.
 * 개발 서버에서는 데모 컨트롤(Tweaks)이 provider 를 감싼다. 프로덕션 빌드에서는 이 분기가 통째로 빠진다.
 */
export async function AppFrame({ children }: { children: ReactNode }) {
  const snapshot = await loadSnapshot();
  const shell = <AppShell>{children}</AppShell>;
  if (process.env.NODE_ENV === "development") {
    const { DevFrame } = await import("@/dev/tweaks/DevFrame");
    return <DevFrame snapshot={snapshot}>{shell}</DevFrame>;
  }
  return <WtProvider snapshot={snapshot}>{shell}</WtProvider>;
}
