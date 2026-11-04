/**
 * API 호출이 실패한 이유. 화면은 이 분류로 안내 방식을 정한다.
 * - network: 응답을 받지 못함(연결 끊김·시간 초과)
 * - server: 서버 오류(5xx)
 * - auth: 로그인이 풀렸거나 만료됨(401)
 * - forbidden: 권한 없음(403)
 * - notFound: 대상이 없음(404, 이미 삭제됨)
 * - rule: 서비스 규칙에 어긋나 서버가 거절함(중복 아이디, 한도 초과 등). 메시지를 그대로 보여 준다
 */
export type ApiErrorKind =
  "network" | "server" | "auth" | "forbidden" | "notFound" | "rule";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly code?: string;

  constructor(kind: ApiErrorKind, message?: string, code?: string) {
    super(message ?? DEFAULT_MESSAGE[kind]);
    this.name = "ApiError";
    this.kind = kind;
    this.code = code;
  }
}

const DEFAULT_MESSAGE: Record<ApiErrorKind, string> = {
  network: "인터넷 연결을 확인해 주세요.",
  server: "서버에 문제가 생겼어요. 잠시 뒤에 다시 시도해 주세요.",
  auth: "로그인이 만료됐어요.",
  forbidden: "이 작업을 할 권한이 없어요.",
  notFound: "대상을 찾을 수 없어요. 이미 삭제되었을 수 있어요.",
  rule: "요청을 처리하지 못했어요.",
};

/** 어떤 값이 던져져도 ApiError 로 맞춘다. 분류 없이 던져진 Error 는 규칙 거절로 보고 메시지를 살린다 */
export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof Error && e.message) return new ApiError("rule", e.message);
  return new ApiError("server");
}

/** "리뷰를 남기지" 같은 동작 앞부분에 이유를 붙여 한 문장으로 만든다 */
export function failureText(what: string, e: ApiError): string {
  switch (e.kind) {
    case "network":
      return `${what} 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.`;
    case "server":
      return `${what} 못했어요. 잠시 뒤에 다시 시도해 주세요.`;
    case "forbidden":
      return `${what} 못했어요. 이 작업을 할 권한이 없어요.`;
    case "notFound":
      return `${what} 못했어요. 이미 삭제되었을 수 있어요.`;
    case "auth":
      return `${what} 못했어요. 다시 로그인해 주세요.`;
    case "rule":
      return `${what} 못했어요. ${e.message}`;
  }
}
