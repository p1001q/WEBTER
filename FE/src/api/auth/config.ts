/**
 * 백엔드 API 주소(NEXT_PUBLIC_API_BASE_URL). 값이 없으면 로그인·가입을 목업으로 처리해 백엔드 없이 화면만 볼 수 있다.
 * 비밀값을 이 변수에 넣지 않는다. 구글 클라이언트 시크릿은 백엔드에만 있다.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(
  /\/+$/,
  "",
);

/** 실제 구글 로그인·서버 세션을 쓰는지 */
export const realAuth = API_BASE !== "";
