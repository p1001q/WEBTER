import { ViewTransition, type ReactNode } from "react";

/** 화면을 이동할 때마다 본문이 이전 화면과 겹치며 부드럽게 바뀐다 */
export default function MainTemplate({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-fade" exit="page-fade" default="none">
      <main>{children}</main>
    </ViewTransition>
  );
}
