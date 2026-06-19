export type ConsentState = "accepted" | "rejected" | null;

export const CONSENT_KEY = "cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year, in seconds

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
}

export function getConsent(): ConsentState {
  if (typeof document === "undefined") return null;
  const val = readCookie(CONSENT_KEY);
  if (val === "accepted" || val === "rejected") return val;
  return null;
}

export function setConsent(state: "accepted" | "rejected"): void {
  writeCookie(CONSENT_KEY, state, CONSENT_MAX_AGE);
}
