import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";

type State = "err" | "ok" | "idle" | "wait";

const tone: Record<State, string> = {
  err: "text-wine",
  ok: "text-navy",
  idle: "text-muted",
  wait: "text-muted",
};

/** 입력 항목 아래에 붙는 검증·안내 메시지. 내용이 없으면 그리지 않는다 */
export function FieldMessage({
  state,
  children,
}: {
  state: State;
  children?: ReactNode;
}) {
  if (!children) return null;
  const icon: IconName =
    state === "err" ? "alert" : state === "ok" ? "check" : "info";
  return (
    <p
      className={cx(
        "m-0 flex items-start gap-1.5 text-[12.5px] leading-[1.45]",
        tone[state],
      )}
      role={state === "err" ? "alert" : undefined}
    >
      <Icon name={icon} size={14} stroke={2} className="mt-px" />
      {children}
    </p>
  );
}
