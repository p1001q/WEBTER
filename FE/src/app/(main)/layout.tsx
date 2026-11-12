import type { ReactNode } from "react";
import { AppFrame } from "@/components/layout/AppFrame";

/**
 * 앱 셸과 상태 provider. 이 layout 은 화면을 이동해도 유지되므로 로그인·좋아요·저장 같은 상태가 이어진다.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
