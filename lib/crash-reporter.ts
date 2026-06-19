import type { CrashPayload, ConvertParams, FrontendCrashPayload, BackendCrashPayload } from "./types";

export type { CrashPayload, FrontendCrashPayload, BackendCrashPayload };

export function buildFrontendPayload(
  error: Error,
  params: ConvertParams | null,
): FrontendCrashPayload {
  return {
    source: "frontend",
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack ?? "",
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    params,
  };
}

export function buildBackendPayload(
  error: string,
  endpoint: string,
  params: ConvertParams | null,
): BackendCrashPayload {
  return {
    source: "backend",
    timestamp: new Date().toISOString(),
    error,
    endpoint,
    params,
  };
}

/**
 * POSTs payload to /api/crash-report.
 * Returns null on success, the payload on failure (caller shows fallback UI).
 */
export async function reportCrash(payload: CrashPayload): Promise<CrashPayload | null> {
  try {
    const res = await fetch("/api/crash-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok ? null : payload;
  } catch {
    return payload;
  }
}
