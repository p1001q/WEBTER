"use client";

import { createContext, useContext } from "react";
import type { WtStore } from "./types";

export const WtCtx = createContext<WtStore | null>(null);

export function useWt(): WtStore {
  const v = useContext(WtCtx);
  if (!v) throw new Error("useWt 는 WtProvider 안에서만 쓸 수 있어요.");
  return v;
}
