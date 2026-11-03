import { ViewTransition, type ReactElement } from "react";

/** 목록 항목 하나. 같은 화면 안에서 목록이 바뀔 때(`inListTransition`)만 움직인다 */
export function ListItemTransition({ children }: { children: ReactElement }) {
  return (
    <ViewTransition
      enter={{ "list-change": "list-in", default: "none" }}
      exit={{ "list-change": "list-out", default: "none" }}
      update={{ "list-change": "auto", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
