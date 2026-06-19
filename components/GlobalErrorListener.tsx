"use client";

import { useEffect } from "react";
import { buildFrontendPayload, reportCrash } from "@/lib/crash-reporter";

export function GlobalErrorListener() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      const err =
        event.error instanceof Error ? event.error : new Error(event.message);
      reportCrash(buildFrontendPayload(err, null)).then((failed) => {
        if (failed) console.warn("[image2] crash reporter unreachable", failed);
      });
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const err =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      reportCrash(buildFrontendPayload(err, null)).then((failed) => {
        if (failed) console.warn("[image2] crash reporter unreachable", failed);
      });
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
