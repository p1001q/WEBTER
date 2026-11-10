import { ApiError, type ApiErrorKind } from "../errors";
import { API_BASE } from "./config";

/** 백엔드의 공통 응답 형식(ApiResponse) */
interface Envelope<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
}

const kindOf = (status: number): ApiErrorKind =>
  status === 401
    ? "auth"
    : status === 403
      ? "forbidden"
      : status === 404
        ? "notFound"
        : status >= 500
          ? "server"
          : "rule";

/** 응답이 이 시간 안에 오지 않으면 네트워크 오류로 본다(세션 확인이 멈춰 화면이 비지 않게) */
const REQUEST_TIMEOUT_MS = 10_000;

async function send<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    // 세션 쿠키를 주고받는다. 백엔드의 CORS 허용 도메인에 이 사이트가 들어 있어야 한다
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError("network");
  }
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    // 본문이 없거나 JSON 이 아니면 상태 코드로만 판단한다
  }
  if (!res.ok || !body?.success) {
    const kind = kindOf(res.status);
    // 서비스 규칙으로 거절된 경우(중복 아이디 등)에는 서버 메시지를 그대로 보여 준다
    throw new ApiError(
      kind,
      kind === "rule" ? body?.message : undefined,
      body?.code,
    );
  }
  return body.data;
}

export const getJson = <T>(path: string) => send<T>(path);

/** 상태를 바꾸는 요청. 요청마다 CSRF 토큰을 새로 받아 헤더에 싣는다 */
async function mutate<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  json?: unknown,
): Promise<T> {
  const csrf = await send<{ headerName: string; token: string }>(
    "/api/auth/csrf",
  );
  return send<T>(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
    },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
}

export const postJson = <T>(path: string, json?: unknown) =>
  mutate<T>("POST", path, json);
export const putJson = <T>(path: string, json?: unknown) =>
  mutate<T>("PUT", path, json);
export const patchJson = <T>(path: string, json: unknown) =>
  mutate<T>("PATCH", path, json);
export const deleteJson = <T>(path: string) => mutate<T>("DELETE", path);
