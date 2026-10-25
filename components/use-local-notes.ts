"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadNotes,
  persistNotes,
  NotesError,
  type Note,
  type NotesStorage,
  NOTES_STORAGE_KEY,
} from "@/lib/notes";
const storage: NotesStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
interface Session {
  notes: Note[];
  raw: string | null;
  loaded: boolean;
  dirty: boolean;
  blocked: boolean;
  status: "loading" | "idle" | "pending" | "saved" | "error";
  error: NotesError | null;
}
const initial: Session = {
  notes: [],
  raw: null,
  loaded: false,
  dirty: false,
  blocked: false,
  status: "loading",
  error: null,
};
export function useLocalNotes() {
  const [state, setState] = useState<Session>(initial);
  const current = useRef<Session>(initial);
  const mounted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const publish = useCallback((next: Session) => {
    current.current = next;
    if (mounted.current) setState(next);
  }, []);
  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const value = current.current;
    if (!value.loaded || !value.dirty || value.blocked) return;
    try {
      const raw = persistNotes(storage, value.notes, value.raw);
      publish({ ...value, raw, dirty: false, status: "saved", error: null });
    } catch (error) {
      const failure =
        error instanceof NotesError
          ? error
          : new NotesError("Could not save notes.", "storage");
      publish({
        ...value,
        status: "error",
        blocked: failure.code === "conflict",
        error: failure,
      });
    }
  }, [publish]);
  const reload = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    try {
      const loaded = loadNotes(storage);
      publish({
        ...initial,
        ...loaded,
        loaded: true,
        status: loaded.raw === null ? "idle" : "saved",
      });
    } catch (error) {
      publish({
        ...current.current,
        loaded: false,
        blocked: true,
        status: "error",
        error: error as NotesError,
      });
    }
  }, [publish]);
  useEffect(() => {
    mounted.current = true;
    reload();
    const leaving = (event: BeforeUnloadEvent) => {
      flush();
      if (current.current.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const hiding = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const changed = (event: StorageEvent) => {
      if (event.key !== NOTES_STORAGE_KEY && event.key !== null) return;
      if (current.current.dirty) {
        if (timer.current) clearTimeout(timer.current);
        publish({
          ...current.current,
          status: "error",
          blocked: true,
          error: new NotesError(
            "Notes changed in another tab. Choose which version to keep before saving.",
            "conflict"
          ),
        });
      } else reload();
    };
    window.addEventListener("beforeunload", leaving);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hiding);
    window.addEventListener("storage", changed);
    return () => {
      mounted.current = false;
      flush();
      window.removeEventListener("beforeunload", leaving);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hiding);
      window.removeEventListener("storage", changed);
    };
  }, [flush, publish, reload]);
  const change = useCallback(
    (transform: (notes: Note[]) => Note[]) => {
      const value = current.current;
      if (!value.loaded) return;
      const notes = transform(value.notes);
      if (notes === value.notes) return;
      publish({
        ...value,
        notes,
        dirty: true,
        status: value.blocked ? "error" : "pending",
        error: value.blocked ? value.error : null,
      });
      if (timer.current) clearTimeout(timer.current);
      if (!value.blocked) timer.current = setTimeout(flush, 500);
    },
    [flush, publish]
  );
  const keepThisTab = useCallback(() => {
    try {
      const raw = storage.getItem(NOTES_STORAGE_KEY);
      publish({ ...current.current, raw, blocked: false, error: null });
      flush();
    } catch {
      publish({
        ...current.current,
        status: "error",
        error: new NotesError(
          "Browser storage is unavailable. Your other-tab conflict is unresolved. Export your notes or retry choosing a version.",
          "conflict"
        ),
      });
    }
  }, [flush, publish]);
  const reset = useCallback(() => {
    try {
      const raw = storage.getItem(NOTES_STORAGE_KEY);
      const saved = persistNotes(storage, [], raw);
      publish({ ...initial, loaded: true, raw: saved, status: "saved" });
    } catch (error) {
      publish({ ...current.current, status: "error", error: error as NotesError });
    }
  }, [publish]);
  return { ...state, change, flush, reload, keepThisTab, reset };
}
