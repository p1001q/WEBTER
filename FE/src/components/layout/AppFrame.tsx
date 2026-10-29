import type { ReactNode } from "react";
import { createApi } from "@/api";
import { WtProvider } from "@/providers/WtProvider";
import { AppShell } from "./AppShell";

/**
 * 상태 provider 와 앱 셸을 서버에서 조립한다. `(main)/layout` 과 `not-found` 가 같이 쓴다.
 * 초기 데이터는 서버에서 받아 provider 에 넘기므로 서버와 클라이언트가 같은 값으로 시작한다.
 */
export async function AppFrame({ children }: { children: ReactNode }) {
  const snapshot = await createApi().bootstrap();
  return (
    <WtProvider snapshot={snapshot}>
      <AppShell>{children}</AppShell>
    </WtProvider>
  );
}
