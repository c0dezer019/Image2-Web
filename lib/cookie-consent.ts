export type ConsentState = "accepted" | "rejected" | null;

export const CONSENT_KEY = "cookie_consent";

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === "accepted" || val === "rejected") return val;
  return null;
}

export function setConsent(state: "accepted" | "rejected"): void {
  localStorage.setItem(CONSENT_KEY, state);
}
