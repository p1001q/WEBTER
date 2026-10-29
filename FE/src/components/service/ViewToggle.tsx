"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { ViewMode } from "@/providers/types";

/** 카드형·목록형 보기 전환 */
export function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <SegmentedControl
      compact
      label="보기 방식"
      value={value}
      onChange={onChange}
      options={[
        ["card", "카드형", "grid"],
        ["list", "목록형", "list"],
      ]}
    />
  );
}
