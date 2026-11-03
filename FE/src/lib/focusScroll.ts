const TARGET =
  "input:not([type=file]), textarea, select, button[aria-pressed], [role=radio], [role=switch], label:has(input[type=file])";

/** 아래쪽 요소가 올라와 놓이는 선: 화면 중앙선(50%)보다 살짝 아래(60%) */
const CENTER_LINE = 0.5;
const LOWER_LINE = 0.6;
/** 위쪽 요소가 내려와 놓이는 선: 중앙선 위쪽 절반의 중앙(25%) */
const UPPER_LINE = 0.25;
/** 아래쪽 선에서 이만큼(px)까지 아래에 있는 것은 움직이지 않는다 */
const SLACK = 24;

/**
 * 입력 칸·선택 칩·스위치를 누르거나 포커스할 때 화면을 맞춘다.
 * - 화면 아래쪽(60% 선보다 아래)에 있으면 그 선으로 올라온다. 누를 때마다 아래 요소가 올라와서
 *   직접 스크롤하지 않고도 클릭만으로 끝까지 채울 수 있다.
 * - 화면 맨 위쪽(25% 선보다 위)에 있으면 그 선으로 내려온다.
 * - 두 선 사이에 있으면 움직이지 않는다.
 */
export function scrollFieldIntoFocus(target: EventTarget) {
  if (!(target instanceof Element)) return;
  const el = target.closest(TARGET);
  if (!el) return;
  const vh = window.innerHeight;
  const { top, bottom } = el.getBoundingClientRect();
  let delta = 0;
  if (top > vh * LOWER_LINE + SLACK) delta = top - vh * LOWER_LINE;
  // 긴 칸(예: 텍스트 영역)은 위쪽 끝만 보고 아래로 내리지 않는다. 칸 전체가 중앙선 위에 있을 때만 내려온다
  else if (top < vh * UPPER_LINE && bottom <= vh * CENTER_LINE)
    delta = top - vh * UPPER_LINE;
  if (!delta) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollBy({ top: delta, behavior: reduce ? "auto" : "smooth" });
}
