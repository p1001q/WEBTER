import { Suspense, type ReactNode } from "react";
import { ModalHost } from "@/components/modals/ModalHost";
import { Header } from "./Header";
import { InertWhenOverlay } from "./InertWhenOverlay";
import { NetworkBanner } from "./NetworkBanner";
import { Sidebar } from "./Sidebar";
import { ToastHost } from "./ToastHost";

/**
 * 헤더 · 본문 · 사이드바 · 모달 · 토스트로 이루어진 앱 셸. provider 안쪽에 둔다.
 * `shell` 은 전체 화면, `app` 은 사이드바를 제외한 본문의 반응형 기준이다.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen @container/shell">
      <InertWhenOverlay>
        <div className="sticky top-0 z-30 @container/app">
          <Header />
        </div>
      </InertWhenOverlay>
      <div className="app-body">
        <Suspense
          fallback={
            <div
              aria-hidden="true"
              className="hidden h-[calc(100dvh-var(--spacing-header))] @min-[1180px]/shell:block"
            />
          }
        >
          <Sidebar />
        </Suspense>
        <div className="min-w-0 @container/app">
          <InertWhenOverlay>
            <NetworkBanner />
            {children}
          </InertWhenOverlay>
        </div>
      </div>
      <ModalHost />
      <ToastHost />
    </div>
  );
}
