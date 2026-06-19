"use client";

import { useEffect } from "react";
import { buildFrontendPayload, reportCrash } from "@/lib/crash-reporter";

export function GlobalErrorListener() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      const err =
        event.error instanceof Error ? event.error : new Error(event.message || "Unknown error");
      reportCrash(buildFrontendPayload(err, null)).then((failed) => {
        if (failed) console.warn("[image2] crash reporter unreachable", failed);
      }).catch(() => console.warn("[image2] crash reporter unreachable"));
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const err =
        event.reason instanceof Error
          ? event.reason
          : new Error(typeof event.reason === "string" ? event.reason : "Unhandled promise rejection");
      reportCrash(buildFrontendPayload(err, null)).then((failed) => {
        if (failed) console.warn("[image2] crash reporter unreachable", failed);
      }).catch(() => console.warn("[image2] crash reporter unreachable"));
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
