"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { realAuth } from "@/api/auth/config";
import { toApiError } from "@/api/errors";
import {
  draftImageResolver,
  type DraftPayload,
} from "@/api/real/registrationDraftApi";
import type { FormState } from "./serviceFormState";
import type { DraftSession } from "./RegistrationDraftGate";

export const DRAFT_AUTOSAVE_MS = 30_000;
export type DraftStatus = "idle" | "saving" | "saved" | "error";
const fingerprint = (form: FormState, tagInput: string) =>
  JSON.stringify({ ...form, agree: false, tagInput });
function payloadOf(form: FormState, tagInput: string): DraftPayload {
  const fields = Object.fromEntries(
    Object.entries(form).filter(([key]) => key !== "agree"),
  ) as Omit<FormState, "agree">;
  return {
    ...fields,
    tagInput,
    scrollY: Math.max(0, Math.round(window.scrollY)),
  };
}

export function useRegistrationDraft(
  session: DraftSession | undefined,
  form: FormState,
  tagInput: string,
) {
  const api = session?.api;
  const initial = session?.initial;
  const [resolveImages] = useState(() => draftImageResolver());
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [automatic, setAutomatic] = useState(false);
  const [error, setError] = useState("");
  const live = useRef({ form, tagInput });
  const revision = useRef(session?.initial?.revision ?? null);
  const saved = useRef(fingerprint(form, tagInput));
  const request = useRef<Promise<boolean> | null>(null);
  const reset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = useRef(true);
  const paused = useRef(false);
  const conflict = useRef(false);
  const completed = useRef(false);
  useEffect(() => {
    live.current = { form, tagInput };
  }, [form, tagInput]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      clearTimeout(reset.current);
    };
  }, []);

  const save = useCallback(
    (automatic = false): Promise<boolean> => {
      if (!api || paused.current || completed.current)
        return Promise.resolve(false);
      if (request.current) return request.current;
      if (
        automatic &&
        (conflict.current ||
          saved.current ===
            fingerprint(live.current.form, live.current.tagInput))
      )
        return Promise.resolve(false);
      const snapshot = live.current;
      const signature = fingerprint(snapshot.form, snapshot.tagInput);
      clearTimeout(reset.current);
      setStatus("saving");
      setAutomatic(automatic);
      setError("");
      const pending = (async () => {
        try {
          const payload = await resolveImages(
            payloadOf(snapshot.form, snapshot.tagInput),
          );
          if (!active.current) return false;
          const result = await api.save(revision.current, payload);
          revision.current = result.revision;
          saved.current = signature;
          if (active.current) {
            setStatus("saved");
            reset.current = setTimeout(() => {
              if (active.current) setStatus("idle");
            }, 3000);
          }
          return true;
        } catch (error) {
          const failure = toApiError(error);
          if (failure.code === "DRAFT_409_01") conflict.current = true;
          if (active.current) {
            setError(failure.message);
            setStatus("error");
          }
          return false;
        } finally {
          request.current = null;
        }
      })();
      request.current = pending;
      return pending;
    },
    [api, resolveImages],
  );

  useEffect(() => {
    if (!api) return;
    const timer = setInterval(() => {
      void save(true);
    }, DRAFT_AUTOSAVE_MS);
    const visibility = () => {
      if (document.visibilityState === "hidden") void save(true);
    };
    const leave = (event: BeforeUnloadEvent) => {
      if (
        !completed.current &&
        (request.current ||
          saved.current !==
            fingerprint(live.current.form, live.current.tagInput))
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("beforeunload", leave);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("beforeunload", leave);
    };
  }, [api, save]);

  useEffect(() => {
    if (!initial) return;
    const frame = requestAnimationFrame(() =>
      window.scrollTo({
        top: initial.payload.scrollY ?? 0,
        behavior: "instant",
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [initial]);

  return {
    status,
    automatic,
    error,
    save,
    prepare: async (snapshot: FormState) => {
      paused.current = true;
      await request.current;
      try {
        const payload = await resolveImages(payloadOf(snapshot, ""));
        const { tagInput: _tag, scrollY: _scroll, ...fields } = payload;
        void _tag;
        void _scroll;
        return {
          form: { ...fields, agree: snapshot.agree },
          revision: revision.current ?? undefined,
        };
      } catch (error) {
        paused.current = false;
        throw error;
      }
    },
    resume: () => {
      paused.current = false;
    },
    complete: async () => {
      completed.current = true;
      if (!realAuth && revision.current && api)
        await api.discard(revision.current);
    },
  };
}
