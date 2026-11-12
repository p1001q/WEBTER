import Link from "next/link";
import type { ComponentProps } from "react";
import { pathFor, type RouteName, type RouteParams } from "@/lib/routes";

type RouteLinkProps = { to: RouteName; params?: RouteParams } & Omit<
  ComponentProps<typeof Link>,
  "href"
>;

/** 화면 이름과 파라미터로 이동하는 내부 링크 */
export function RouteLink({ to, params, ...rest }: RouteLinkProps) {
  return <Link href={pathFor(to, params)} {...rest} />;
}
