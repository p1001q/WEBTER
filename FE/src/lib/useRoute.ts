"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { routeNameOf, type RouteName } from "./routes";

/**
 * 현재 화면 이름과 쿼리. `useSearchParams` 를 쓰므로 이 훅을 쓰는 컴포넌트는
 * 정적 렌더링 때 Suspense 경계가 필요하다.
 */
export function useRoute(): {
  name: RouteName | null;
  query: Record<string, string>;
} {
  const pathname = usePathname();
  const search = useSearchParams();
  return { name: routeNameOf(pathname), query: Object.fromEntries(search) };
}
