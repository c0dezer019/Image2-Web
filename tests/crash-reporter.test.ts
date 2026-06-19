import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  reportCrash,
  buildFrontendPayload,
  buildBackendPayload,
} from "../lib/crash-reporter";
import type { ConvertParams } from "../lib/types";
import { setCrashConsent } from "../lib/cookie-consent";

const baseParams: ConvertParams = {
  mode: "ascii",
  width: 100,
  contrast: 1.5,
  brightness: 1.0,
  sharpness: 2.5,
  saturate: 1.0,
  minLum: 0.0,
  fontSize: 6,
  palette: "truecolor",
  imgWidth: 0,
  imgHeight: 0,
  invert: false,
  blur: 0,
  dense: false,
};

describe("buildFrontendPayload", () => {
  it("sets source to frontend", () => {
    const err = new Error("boom");
    const p = buildFrontendPayload(err, baseParams);
    expect(p.source).toBe("frontend");
  });

  it("copies error message and stack", () => {
    const err = new Error("oops");
    const p = buildFrontendPayload(err, null);
    expect(p.error).toBe("oops");
    expect(p.stack).toBe(err.stack ?? "");
  });

  it("accepts null params", () => {
    const p = buildFrontendPayload(new Error("x"), null);
    expect(p.params).toBeNull();
  });
});

describe("buildBackendPayload", () => {
  it("sets source to backend", () => {
    const p = buildBackendPayload("bad image", "/convert/ascii", baseParams);
    expect(p.source).toBe("backend");
  });

  it("stores endpoint", () => {
    const p = buildBackendPayload("err", "/analyze", null);
    expect(p.endpoint).toBe("/analyze");
  });
});

describe("reportCrash", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when webhook succeeds", async () => {
    const payload = buildFrontendPayload(new Error("test"), null);
    const result = await reportCrash(payload);
    expect(result).toBeNull();
  });

  it("returns payload when webhook returns non-ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false }),
    );
    const payload = buildFrontendPayload(new Error("test"), null);
    const result = await reportCrash(payload);
    expect(result).toEqual(payload);
  });

  it("returns payload when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );
    const payload = buildFrontendPayload(new Error("test"), null);
    const result = await reportCrash(payload);
    expect(result).toEqual(payload);
  });

  it("POSTs to /api/crash-report with JSON body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    const payload = buildFrontendPayload(new Error("test"), null);
    await reportCrash(payload);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/crash-report",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
  });

  it("does not call fetch when crash consent is rejected", async () => {
    setCrashConsent("rejected");
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    const payload = buildFrontendPayload(new Error("test"), null);
    const result = await reportCrash(payload);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("calls fetch when crash consent is accepted (default)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    const payload = buildFrontendPayload(new Error("test"), null);
    await reportCrash(payload);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
