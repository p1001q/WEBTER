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

/**
 * 문장으로 찾는 AI 검색을 쓸 수 있는지. 지금은 목업 규칙뿐이라 서버에 연결하면 쓸 수 없고(서버에 AI 검색 API가 없다),
 * 이때는 일반 검색 결과를 보여 준다. 서버 API가 생기면 이 값을 켠다.
 */
export const aiSearchAvailable = !realAuth;

/**
 * 서버 렌더링이 백엔드에 접속하는 주소. 브라우저가 쓰는 주소(API_BASE)와 다를 때(컨테이너 안 등)
 * API_INTERNAL_BASE_URL 로 지정한다. 없으면 API_BASE 를 쓴다.
 */
export const API_SERVER_BASE = (
  process.env.API_INTERNAL_BASE_URL || API_BASE
).replace(/\/+$/, "");
