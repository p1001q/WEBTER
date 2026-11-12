/** 미리보기 한 장(갤러리·라이트박스 공통) 틀 */
export const shotClass = (port: boolean) =>
  `relative block shrink-0 overflow-hidden rounded-md border border-border bg-light p-0 ${
    port
      ? "aspect-[9/16] w-[200px] @max-[560px]/app:w-[150px]"
      : "aspect-video w-[440px] @max-[560px]/app:w-[300px]"
  }`;
