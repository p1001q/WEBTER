"use client";

import { useSyncExternalStore } from "react";

// globals.css의 shell 분기와 같은 기준을 사용한다.
export const DESKTOP_NAVIGATION_QUERY = "(min-width: 1180px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_NAVIGATION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useDesktopNavigation() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_NAVIGATION_QUERY).matches,
    () => false,
  );
}
