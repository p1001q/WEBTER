import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

export type ButtonVariant =
  "primary" | "ink" | "outline" | "ghost" | "soft" | "danger" | "text";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonStyle {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 부모 너비를 꽉 채운다 */
  block?: boolean;
}

// 변형마다 색·테두리를 모두 정해서 서로 다른 변형 클래스가 겹치지 않게 한다.
const VARIANT: Record<ButtonVariant, string> = {
  primary: "border border-transparent bg-navy text-white hover:bg-navy-700",
  ink: "border border-transparent bg-ink text-white hover:bg-black",
  outline:
    "border border-ink bg-transparent text-ink hover:bg-ink hover:text-white",
  ghost: "border border-border bg-card text-ink hover:bg-light",
  soft: "border border-transparent bg-light text-ink hover:bg-[#e8e7e2]",
  danger: "border border-transparent bg-wine text-white hover:bg-wine-700",
  text: "border-0 bg-transparent text-muted hover:text-ink",
};
const SIZE: Record<ButtonSize, string> = {
  sm: "h-ctl-sm px-3 text-13",
  md: "h-ctl-md px-4 text-14",
  lg: "h-ctl-lg px-6 text-16",
};

/**
 * 버튼 모양의 클래스. 링크(`RouteLink`)를 버튼처럼 보이게 할 때 쓴다.
 * 크기를 바꿔야 하면 className 에 `h-11!` 처럼 중요도(!)를 붙여 덮어쓴다.
 */
export function buttonClass({
  variant = "primary",
  size = "md",
  block,
}: ButtonStyle = {}) {
  return cx(
    "inline-flex items-center justify-center gap-1.5 rounded-pill font-semibold whitespace-nowrap transition-colors duration-150",
    "active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-42 aria-disabled:cursor-not-allowed aria-disabled:opacity-42",
    VARIANT[variant],
    // text 변형은 좌우 여백이 8px 이다(보관본 .wt-btn-text)
    variant === "text" && size === "md" ? "h-ctl-md px-2 text-14" : SIZE[size],
    block && "w-full",
  );
}

export function Button({
  variant,
  size,
  block,
  className,
  ...rest
}: ButtonStyle & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(buttonClass({ variant, size, block }), className)}
      {...rest}
    />
  );
}
