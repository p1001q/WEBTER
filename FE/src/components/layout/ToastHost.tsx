"use client";

import { Toast } from "@/components/ui/Toast";
import { useWt } from "@/providers/context";

export function ToastHost() {
  return <Toast toast={useWt().toastState} />;
}
