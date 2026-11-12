"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * 주소(경로·쿼리)가 바뀔 때마다 `onChange` 를 부른다. 어떤 경로의 이동이든(Link, 키보드, 코드) 잡는다.
 * `useSearchParams` 때문에 Suspense 안에 두고, 아무것도 그리지 않는다.
 */
export function RouteWatcher({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const key = `${pathname}?${search}`;
  const prev = useRef(key);
  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    onChange();
  }, [key, onChange]);
  return null;
}
