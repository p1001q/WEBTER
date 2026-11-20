import { realAuth } from "../auth/config";
import { deleteJson, getJson, postJson, putJson } from "../auth/http";
import { ApiError } from "../errors";

export interface ReflectionEntry {
  id: string;
  serviceId: string | null;
  serviceName: string;
  title: string;
  body: string;
  revision: string;
  createdAt: string;
  updatedAt: string;
}
export interface ReflectionSummary {
  id: string;
  serviceId: string | null;
  serviceName: string;
  title: string;
  excerpt: string;
  updatedAt: string;
}
export interface ReflectionPage {
  items: ReflectionSummary[];
  total: number;
  page: number;
  size: number;
}
export interface ReflectionInput {
  serviceId: string | null;
  title: string;
  body: string;
}
type BackendEntry = Omit<ReflectionEntry, "serviceId"> & {
  serviceId: number | null;
};
const path = "/api/users/me/reflections";
const entry = (value: BackendEntry): ReflectionEntry => ({
  ...value,
  serviceId: value.serviceId == null ? null : String(value.serviceId),
});

export function reflectionApi(userId: string) {
  const key = `webter:reflections:${userId}`;
  const read = (): ReflectionEntry[] =>
    JSON.parse(localStorage.getItem(key) ?? "[]");
  const write = (items: ReflectionEntry[]) =>
    localStorage.setItem(key, JSON.stringify(items));
  const check = (items: ReflectionEntry[], id: string, revision?: string) => {
    const note = items.find((item) => item.id === id);
    if (!note) throw new ApiError("notFound");
    if (revision && note.revision !== revision)
      throw new ApiError(
        "rule",
        "다른 화면에서 회고가 변경됐어요. 다시 불러와 주세요.",
      );
    return note;
  };
  return {
    list: async (page: number, serviceId = ""): Promise<ReflectionPage> => {
      if (realAuth) {
        const params = new URLSearchParams({
          page: String(page),
          size: "20",
          ...(serviceId ? { serviceId } : {}),
        });
        const result = await getJson<
          Omit<ReflectionPage, "items"> & {
            items: (Omit<ReflectionSummary, "serviceId"> & {
              serviceId: number | null;
            })[];
          }
        >(`${path}?${params}`);
        return {
          ...result,
          items: result.items.map((item) => ({
            ...item,
            serviceId: item.serviceId == null ? null : String(item.serviceId),
          })),
        };
      }
      const all = read()
        .filter((note) => !serviceId || note.serviceId === serviceId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return {
        page,
        size: 20,
        total: all.length,
        items: all
          .slice(page * 20, (page + 1) * 20)
          .map((note) => ({ ...note, excerpt: note.body.slice(0, 160) })),
      };
    },
    get: async (id: string) =>
      realAuth
        ? entry(
            await getJson<BackendEntry>(`${path}/${encodeURIComponent(id)}`),
          )
        : check(read(), id),
    save: async (
      note: ReflectionEntry | null,
      input: ReflectionInput,
      serviceName: string,
    ) => {
      if (realAuth) {
        const body = {
          ...input,
          serviceId: input.serviceId == null ? null : Number(input.serviceId),
        };
        return entry(
          note
            ? await putJson<BackendEntry>(
                `${path}/${encodeURIComponent(note.id)}`,
                { ...body, revision: note.revision },
              )
            : await postJson<BackendEntry>(path, body),
        );
      }
      const all = read();
      if (note) check(all, note.id, note.revision);
      const now = new Date().toISOString();
      const result: ReflectionEntry = {
        ...input,
        title: input.title.trim(),
        body: input.body,
        serviceName,
        id: note?.id ?? crypto.randomUUID(),
        revision: crypto.randomUUID(),
        createdAt: note?.createdAt ?? now,
        updatedAt: now,
      };
      write([result, ...all.filter((item) => item.id !== result.id)]);
      return result;
    },
    remove: async (note: ReflectionEntry) => {
      if (realAuth)
        return deleteJson<null>(
          `${path}/${encodeURIComponent(note.id)}?revision=${encodeURIComponent(note.revision)}`,
        ).then(() => {});
      const all = read();
      check(all, note.id, note.revision);
      write(all.filter((item) => item.id !== note.id));
    },
  };
}
export type ReflectionApi = ReturnType<typeof reflectionApi>;
