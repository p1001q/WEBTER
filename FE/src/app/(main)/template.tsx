import type { ReactNode } from "react";

/** 화면을 이동할 때마다 본문이 짧게 나타난다 */
export default function MainTemplate({ children }: { children: ReactNode }) {
  return <main className="animate-enter">{children}</main>;
}
