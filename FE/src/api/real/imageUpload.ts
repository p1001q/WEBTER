import { ApiError } from "../errors";
import { postJson } from "../auth/http";

/** 서버가 발급한 업로드 주소(POST /api/uploads/images 응답) */
interface UploadTicket {
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
  imageUrl: string;
}

const FAILED = "이미지를 올리지 못했어요. 잠시 뒤 다시 시도해 주세요.";

/**
 * 브라우저에서 고른 이미지(data 주소)를 저장소에 직접 올리고 올린 이미지의 주소를 돌려준다.
 * 서버에서 일회용 업로드 주소를 받은 뒤 그 주소로 파일을 올린다(서버를 거치지 않는다).
 */
export async function uploadDataUrl(dataUrl: string): Promise<string> {
  let blob: Blob;
  try {
    blob = await (await fetch(dataUrl)).blob();
  } catch {
    throw new ApiError("rule", FAILED);
  }
  const ticket = await postJson<UploadTicket>("/api/uploads/images", {
    contentType: blob.type,
    size: blob.size,
  });
  let res: Response;
  try {
    res = await fetch(ticket.uploadUrl, {
      method: ticket.method,
      headers: ticket.headers,
      body: blob,
      // 저장소에는 우리 세션 쿠키를 보내지 않는다
      credentials: "omit",
    });
  } catch {
    throw new ApiError("network");
  }
  if (!res.ok) throw new ApiError("rule", FAILED);
  return ticket.imageUrl;
}

const isLocalFile = (v?: string | null): v is string =>
  !!v && v.startsWith("data:");

/**
 * 서비스 값의 이미지 중 브라우저에서 고른 것(data 주소)만 올려 서버 주소로 바꾼다.
 * 이미 서버에 있는 이미지 주소는 그대로 둔다. 올리다 실패하면 서비스 저장은 시작하지 않는다.
 */
export async function resolveImages<
  T extends {
    iconImg?: string | null;
    thumbImg?: string | null;
    previews: { imgs?: string[] } | null;
  },
>(
  s: T,
  upload: (dataUrl: string) => Promise<string> = uploadDataUrl,
): Promise<T> {
  const one = async (v?: string | null) =>
    isLocalFile(v) ? upload(v) : (v ?? null);
  const [iconImg, thumbImg] = await Promise.all([
    one(s.iconImg),
    one(s.thumbImg),
  ]);
  const imgs = s.previews?.imgs
    ? await Promise.all(s.previews.imgs.map((u) => one(u) as Promise<string>))
    : undefined;
  return {
    ...s,
    iconImg,
    thumbImg,
    previews: s.previews ? { ...s.previews, imgs } : null,
  };
}
