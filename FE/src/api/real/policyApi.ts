import { API_SERVER_BASE } from "../auth/config";

/** 현재 적용 중인 약관 원문(GET /api/policies/{종류}) */
export interface PolicyContent {
  documentType: string;
  version: string;
  title: string;
  /** 마크다운 */
  content: string;
  effectiveAt: string | null;
}

/** 서버 렌더링에서 약관 원문을 읽는다. 읽지 못하면 null (오래된 문구를 대신 보여 주지 않는다) */
export async function fetchPolicyContent(
  type: "terms" | "privacy",
): Promise<PolicyContent | null> {
  try {
    const res = await fetch(`${API_SERVER_BASE}/api/policies/${type}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      success?: boolean;
      data?: PolicyContent;
    };
    return body.success && body.data ? body.data : null;
  } catch {
    return null;
  }
}
