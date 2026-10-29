"use client";

/** 루트 layout 자체에서 오류가 났을 때. 스타일 없이 최소한만 보여준다 */
export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{ fontFamily: "sans-serif", textAlign: "center", padding: 48 }}
      >
        <h1>문제가 생겼어요</h1>
        <p>잠시 뒤에 다시 시도해 주세요.</p>
        <button onClick={reset}>다시 시도</button>
      </body>
    </html>
  );
}
