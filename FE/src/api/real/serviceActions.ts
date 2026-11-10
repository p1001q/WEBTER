import { deleteJson, getJson, postJson, putJson } from "../auth/http";
import type { ServiceInput, UrlServerCheck, Version } from "../types";
import type { WebterApi } from "../webterApi";
import {
  CODE_BY_ID,
  DEVICE_CODE,
  LANG_CODE,
  PRICE_CODE,
  PROJECT_TYPE_CODE,
} from "./codes";
import { mapService, type BackendService } from "./serviceApi";

/** 서버가 받는 이미지 주소: https 주소이거나 서버 업로드 경로. 그 밖(브라우저에서 고른 파일의 임시 주소 등)은 보내지 않는다 */
const imageUrl = (v?: string | null) =>
  v && (v.startsWith("https://") || v.startsWith("/uploads/")) ? v : null;

/** 화면의 서비스 값을 서비스 등록·수정 요청으로 바꾼다 */
type ServiceFields = Omit<ServiceInput, "iconImg" | "thumbImg"> & {
  iconImg?: string | null;
  thumbImg?: string | null;
};

export function toServiceRequest(s: ServiceFields) {
  return {
    name: s.name,
    tagline: s.tagline,
    url: s.url,
    githubUrl: s.github,
    categories: s.cats.map((c) => CODE_BY_ID[c]),
    projectType: PROJECT_TYPE_CODE[s.type],
    devices: s.devices.map((d) => DEVICE_CODE[d]),
    priceType: PRICE_CODE[s.price],
    teamName: s.team,
    description: s.desc,
    tags: s.tags,
    languages: s.langs.map((l) => LANG_CODE[l]),
    iconUrl: imageUrl(s.iconImg),
    thumbnailUrl: imageUrl(s.thumbImg),
    previewRatio: s.previews?.ratio === "port" ? "PORTRAIT" : "LANDSCAPE",
    previewFit: s.previews?.fit === "contain" ? "CONTAIN" : "COVER",
    previewImages: (s.previews?.imgs ?? []).flatMap((u) => {
      const v = imageUrl(u);
      return v ? [v] : [];
    }),
    allowGuestReviews: s.allowGuest,
    allowAnonymousReviews: s.allowAnon,
    allowAnonymousComments: s.allowAnonComment,
    // 등록 화면은 동의 확인을 마쳐야 제출할 수 있다
    agreeRegistration: true,
  };
}

/** 버전 기록 목록 → 요청. 서버에 있는 기록(숫자 id)만 id를 보내고, 화면에서 새로 만든 기록은 id 없이 보낸다 */
export const toVersionRequests = (versions: Version[]) =>
  versions.map((v) => ({
    id: /^\d+$/.test(v.id) ? v.id : null,
    version: v.ver,
    title: v.title,
    content: v.body,
  }));

const detail = async (id: string) =>
  mapService(await getJson<BackendService>(`/api/services/${id}`));

/**
 * 서비스 등록·수정·삭제·주소 검사·내 서비스를 백엔드 API로 처리한다. 리뷰·댓글·반응 같은 나머지는 `base` 그대로다.
 * 수정은 patch 내용에 따라 운영 상태·버전 기록·등록 항목 API로 나뉜다.
 */
export function withRealServices(base: WebterApi): WebterApi {
  return {
    ...base,
    createService: async (input) =>
      mapService(
        await postJson<BackendService>(
          "/api/services",
          toServiceRequest(input),
        ),
      ),
    updateService: async (id, patch) => {
      if ("use" in patch && patch.use) {
        return mapService(
          await putJson<BackendService>(`/api/services/${id}/availability`, {
            status: patch.use === "live" ? "AVAILABLE" : "UNAVAILABLE",
            reason: patch.use === "stop" ? (patch.stopReason ?? "") : null,
          }),
        );
      }
      if (patch.versions) {
        return mapService(
          await putJson<BackendService>(
            `/api/services/${id}/versions`,
            toVersionRequests(patch.versions),
          ),
        );
      }
      // 등록 화면의 수정: 현재 값에 patch 를 덮어 전체를 보낸다
      const current = await detail(id);
      return mapService(
        await putJson<BackendService>(
          `/api/services/${id}`,
          toServiceRequest({ ...current, ...patch }),
        ),
      );
    },
    deleteService: async (id) => {
      await deleteJson<null>(`/api/services/${id}`);
    },
    checkServiceUrl: async (url, selfId): Promise<UrlServerCheck> => {
      const r = await postJson<{
        state: "OK" | "FORMAT" | "DUPLICATE" | "UNREACHABLE";
        message: string;
      }>("/api/services/url-check", {
        url,
        selfId: selfId && /^\d+$/.test(selfId) ? Number(selfId) : null,
      });
      return {
        state:
          r.state === "OK"
            ? "ok"
            : r.state === "DUPLICATE"
              ? "dup"
              : "unreachable",
        msg: r.message,
      };
    },
    myServices: async () =>
      (await getJson<BackendService[]>("/api/users/me/services")).map(
        mapService,
      ),
  };
}
