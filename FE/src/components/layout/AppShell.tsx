import { Suspense, type ReactNode } from "react";
import { ModalHost } from "@/components/modals/ModalHost";
import { Header } from "./Header";
import { InertWhenOverlay } from "./InertWhenOverlay";
import { Sidebar } from "./Sidebar";
import { ToastHost } from "./ToastHost";

/**
 * 헤더 · 본문 · 사이드바 · 모달 · 토스트로 이루어진 앱 셸. provider 안쪽에 둔다.
 * `@container/app` 가 반응형 기준이다(보관본의 `.wt-app` 컨테이너). 본문은 서버 컴포넌트 그대로 받는다.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen @container/app">
      <InertWhenOverlay>
        <Header />
        {children}
      </InertWhenOverlay>
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <ModalHost />
      <ToastHost />
    </div>
  );
}
