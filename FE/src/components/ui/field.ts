/** 입력 항목 공통 클래스. 입력·텍스트 영역·라벨·체크박스가 같은 모양을 쓰게 한다 */
const control =
  "w-full rounded-md border border-border bg-card text-15 text-ink outline-none placeholder:text-placeholder focus:border-navy focus:shadow-[0_0_0_3px_var(--color-focus)]";

export const selectClass = `${control} h-ctl-input px-3.5`;
export const inputClass = `${control} h-ctl-input px-3.5 disabled:bg-light disabled:text-muted`;
export const textareaClass = `${control} min-h-[120px] resize-y px-3.5 py-3 leading-[1.6]`;
export const fieldClass = "flex min-w-0 flex-col gap-2";
export const labelClass = "flex items-center gap-1.5 text-14 font-bold";
export const requiredMarkClass = "font-bold text-wine";
export const counterClass = "ml-auto font-mono text-11 font-normal text-muted";
export const helpClass = "m-0 text-[12.5px] text-muted";
export const checkClass =
  "flex cursor-pointer items-start gap-2.5 text-14 leading-[1.5] [&_input]:mt-px [&_input]:size-[18px] [&_input]:shrink-0 [&_input]:accent-navy";
export const optionalClass = "text-12 font-medium text-muted";
/** 데모용 샘플 값을 채우는 작은 점선 버튼 */
export const demoButtonClass =
  "h-6 rounded-sm border border-dashed border-border-strong px-2 font-mono text-11 text-text-3 hover:border-navy hover:text-navy";
