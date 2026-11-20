import { realAuth } from "../auth/config";
import { deleteJson, getJson, putJson } from "../auth/http";
import { ApiError } from "../errors";
import type { RegistrationFormState } from "../types";
import { uploadDataUrl } from "./imageUpload";

export type DraftPayload = Omit<RegistrationFormState, "agree"> & {
  tagInput: string;
  scrollY: number;
};
export interface RegistrationDraft {
  revision: string;
  savedAt: string;
  payload: DraftPayload;
}
export interface RegistrationDraftApi {
  get: () => Promise<RegistrationDraft | null>;
  save: (
    expectedRevision: string | null,
    payload: DraftPayload,
  ) => Promise<RegistrationDraft>;
  discard: (revision: string) => Promise<void>;
}
const path = "/api/users/me/registration-draft";

export function registrationDraftApi(userId: string): RegistrationDraftApi {
  const key = `webter:registration-draft:${userId}`;
  const read = (): RegistrationDraft | null =>
    JSON.parse(localStorage.getItem(key) ?? "null");
  const conflict = () =>
    new ApiError(
      "rule",
      "다른 화면에서 임시 저장이 변경됐어요. 다시 불러와 주세요.",
      "DRAFT_409_01",
    );
  return {
    get: () =>
      realAuth
        ? getJson<RegistrationDraft | null>(path)
        : Promise.resolve(read()),
    save: async (expectedRevision, payload) => {
      if (realAuth)
        return putJson<RegistrationDraft>(path, { expectedRevision, payload });
      if ((read()?.revision ?? null) !== expectedRevision) throw conflict();
      const draft = {
        revision: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        payload,
      };
      localStorage.setItem(key, JSON.stringify(draft));
      return draft;
    },
    discard: async (revision) => {
      if (realAuth)
        return deleteJson<null>(
          `${path}?revision=${encodeURIComponent(revision)}`,
        ).then(() => {});
      if (read()?.revision !== revision) throw conflict();
      localStorage.removeItem(key);
    },
  };
}

/** 같은 선택 이미지는 자동 저장 때마다 다시 올리지 않는다. 실패한 업로드는 다시 시도할 수 있다. */
export function draftImageResolver(upload = uploadDataUrl) {
  const cache = new Map<string, Promise<string>>();
  return async (payload: DraftPayload): Promise<DraftPayload> => {
    if (!realAuth) return payload;
    const active = new Set([payload.iconImg, payload.thumbImg, ...payload.pv]);
    for (const key of cache.keys()) if (!active.has(key)) cache.delete(key);
    const one = (url: string | null): Promise<string | null> => {
      if (!url?.startsWith("data:")) return Promise.resolve(url);
      let pending = cache.get(url);
      if (!pending) {
        pending = upload(url).catch((error: unknown) => {
          cache.delete(url);
          throw error;
        });
        cache.set(url, pending);
      }
      return pending;
    };
    const [iconImg, thumbImg, pv] = await Promise.all([
      one(payload.iconImg),
      one(payload.thumbImg),
      Promise.all(payload.pv.map((url) => one(url) as Promise<string>)),
    ]);
    return { ...payload, iconImg, thumbImg, pv };
  };
}
