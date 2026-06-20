import type { ConvertParams } from "./types";

const KEY = "image2:lastJob";

export interface LastJobState {
  params: ConvertParams;
  error: string | null;
  timestamp: string;
}

/** Persists the most recent conversion attempt so the feedback form can attach it to bug reports. */
export function saveLastJobState(params: ConvertParams, error: string | null): void {
  if (typeof localStorage === "undefined") return;
  const state: LastJobState = { params, error, timestamp: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private browsing, quota) — feedback form just won't have job context.
  }
}

export function getLastJobState(): LastJobState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastJobState) : null;
  } catch {
    return null;
  }
}
