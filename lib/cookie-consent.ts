export type ConsentState = "accepted" | "rejected" | null;

export const CONSENT_KEY = "cookie_consent";
export const CRASH_CONSENT_KEY = "crash_logging_consent";

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === "accepted" || val === "rejected") return val;
  return null;
}

export function setConsent(state: "accepted" | "rejected"): void {
  localStorage.setItem(CONSENT_KEY, state);
}

/** Crash logging defaults to accepted (opt-out) until the user explicitly rejects it. */
export function getCrashConsent(): "accepted" | "rejected" {
  if (typeof window === "undefined") return "accepted";
  const val = localStorage.getItem(CRASH_CONSENT_KEY);
  return val === "rejected" ? "rejected" : "accepted";
}

export function setCrashConsent(state: "accepted" | "rejected"): void {
  localStorage.setItem(CRASH_CONSENT_KEY, state);
}
