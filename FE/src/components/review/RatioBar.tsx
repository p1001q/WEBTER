/** 추천 비율 막대. 평가가 없으면 빈 막대 */
export function RatioBar({ up, down }: { up: number; down: number }) {
  const n = up + down;
  const r = n ? (up / n) * 100 : 0;
  return (
    <div
      className={`flex h-2 overflow-hidden rounded-[4px] ${n ? "bg-wine-50" : "bg-light"}`}
      role="img"
      aria-label={n ? `추천 ${Math.round(r)}%` : "평가 없음"}
    >
      {n > 0 && (
        <i className="block h-full bg-navy" style={{ width: r + "%" }} />
      )}
    </div>
  );
}
