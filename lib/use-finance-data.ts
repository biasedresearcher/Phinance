"use client";
import { useEffect, useSyncExternalStore } from "react";
import type { FinanceData } from "./types";
import {
  BACKUP_KEY,
  LEGACY_KEY,
  STORAGE_KEY,
  demoData,
  emptyData,
  readStored,
  validateData,
  writeStored,
} from "./finance-repository";

type Snapshot = {
  data: FinanceData;
  ready: boolean;
  error: string;
  savedAt: string;
  demo: boolean;
  raw: string | null;
  recoveryRaw: string | null;
  revision: number;
};
const initial: Snapshot = {
  data: emptyData(),
  ready: false,
  error: "",
  savedAt: "",
  demo: false,
  raw: null,
  recoveryRaw: null,
  revision: 0,
};
let state = initial;
const listeners = new Set<() => void>();
const publish = (next: Snapshot) => {
  state = next;
  listeners.forEach((l) => l());
};
let active = false;
const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "Unable to save. Export your records and try again.";
function load() {
  try {
    const result = readStored(window.localStorage);
    publish({
      ...initial,
      ...result,
      ready: true,
      savedAt: result.raw ? JSON.parse(result.raw).updatedAt : "",
      recoveryRaw: null,
    });
  } catch (e) {
    let raw: string | null = null;
    try {
      raw =
        window.localStorage.getItem(STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_KEY);
    } catch {
      /* Browser may deny storage access. */
    }
    publish({
      ...state,
      ready: true,
      error: `Records could not be loaded: ${message(e)}`,
      recoveryRaw: raw,
    });
  }
}
function initialize() {
  if (active) return;
  active = true;
  load();
  try {
    const demo = window.sessionStorage.getItem("phinance-demo-session");
    if (demo)
      publish({
        ...state,
        data: validateData(JSON.parse(demo)),
        demo: true,
        error: "",
        recoveryRaw: null,
      });
  } catch {
    /* A private browser may restrict session storage. */
  }
  window.addEventListener("storage", (e) => {
    if ((e.key === STORAGE_KEY || e.key === null) && !state.demo) load();
  });
}
export async function updateData(
  update: FinanceData | ((current: FinanceData) => FinanceData),
  expectedRaw?: string | null,
  canApply: () => boolean = () => true,
): Promise<boolean> {
  const save = async () => {
    if (!canApply()) return false;
    if (
      expectedRaw !== undefined &&
      (state.raw !== expectedRaw || state.demo || state.error)
    )
      return false;
    try {
      if (!state.ready || state.recoveryRaw !== null)
        throw new Error(
          "Recover or export the unreadable records in Settings before continuing.",
        );
      const next = validateData(
        typeof update === "function" ? update(state.data) : update,
      );
      if (state.demo) {
        window.sessionStorage.setItem(
          "phinance-demo-session",
          JSON.stringify(next),
        );
        publish({ ...state, data: next, error: "" });
        return true;
      }
      const saved = writeStored(window.localStorage, next, state.raw);
      publish({
        ...state,
        data: saved.data,
        raw: JSON.stringify(saved),
        revision: saved.revision,
        savedAt: saved.updatedAt,
        error: "",
      });
      return true;
    } catch (e) {
      publish({ ...state, error: `Not saved: ${message(e)}` });
      return false;
    }
  };
  // Coordinate the read/check/write operation between tabs in supported browsers.
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request("phinance-write", save);
  return save();
}
export function reloadData() {
  if (state.demo) return;
  load();
}
export function toggleDemo() {
  try {
    if (state.demo) {
      window.sessionStorage.removeItem("phinance-demo-session");
      load();
    } else {
      const demo = demoData();
      window.sessionStorage.setItem(
        "phinance-demo-session",
        JSON.stringify(demo),
      );
      publish({
        ...state,
        data: demo,
        demo: true,
        error: "",
        recoveryRaw: null,
      });
    }
  } catch (e) {
    publish({ ...state, error: `Demo mode could not open: ${message(e)}` });
  }
}
export function downloadText(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportData() {
  downloadText(
    `phinance-${new Date().toISOString().replaceAll(":", "-")}.json`,
    JSON.stringify(
      {
        app: "Phinance",
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        data: state.data,
      },
      null,
      2,
    ),
  );
}
export function rawRecovery() {
  return state.recoveryRaw;
}
export function lastGoodBackup() {
  try {
    return window.localStorage.getItem(BACKUP_KEY);
  } catch {
    return null;
  }
}
export async function replaceData(data: FinanceData): Promise<boolean> {
  if (state.recoveryRaw === null) return updateData(data);
  // Preserve the original, even if it is an empty string. Never overwrite a
  // concurrent repair from another tab while a restore preview is open.
  const restore = async () => {
    try {
      const valid = validateData(data);
      const current = window.localStorage.getItem(STORAGE_KEY);
      const original = current ?? window.localStorage.getItem(LEGACY_KEY);
      if (original !== state.recoveryRaw)
        throw new Error(
          "Saved records changed in another tab. Reload before restoring.",
        );
      window.localStorage.setItem(
        `${STORAGE_KEY}-recovery-${Date.now()}`,
        original ?? "",
      );
      const saved = {
        schemaVersion: 2,
        revision: 1,
        updatedAt: new Date().toISOString(),
        data: valid,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      load();
      return true;
    } catch (e) {
      publish({ ...state, error: `Restore failed: ${message(e)}` });
      return false;
    }
  };
  if (navigator.locks)
    return navigator.locks.request("phinance-write", restore);
  return restore();
}
export function useFinanceData() {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => initial,
  );
  useEffect(initialize, []);
  return { ...snapshot, setData: updateData, reload: reloadData };
}

// Sync reads the latest store, not a stale render captured before a request.
export const getFinanceSnapshot = () => state;
