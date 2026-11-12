import { addTransitionType, startTransition } from "react";

/** 필터·정렬처럼 같은 화면의 목록이 바뀌는 상태 변경. 목록 항목이 부드럽게 나타나고 사라지고 자리를 옮긴다 */
export function inListTransition(update: () => void) {
  startTransition(() => {
    addTransitionType("list-change");
    update();
  });
}
