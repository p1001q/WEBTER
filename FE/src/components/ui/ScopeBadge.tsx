/** MVP에 포함되지 않는 확장 기능 표시 */
export function ScopeBadge() {
  return (
    <span
      className="inline-flex h-[18px] items-center whitespace-nowrap rounded-[3px] border border-dashed border-current bg-wine-50 px-1.5 font-mono text-[10px] font-medium tracking-[.02em] text-wine"
      title="확장 기능 — MVP 미포함"
    >
      확장
    </span>
  );
}
