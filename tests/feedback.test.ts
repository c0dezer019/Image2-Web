import { describe, it, expect, vi, afterEach } from "vitest";
import { submitFeedback, readScreenshot, MAX_SCREENSHOT_BYTES } from "../lib/feedback";
import type { LastJobState } from "../lib/job-state";
import type { ConvertParams } from "../lib/types";

const params: ConvertParams = {
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

describe("submitFeedback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when the request succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const result = await submitFeedback("feedback", "Love the tool!");
    expect(result).toBe(true);
  });

  it("returns false when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await submitFeedback("bug", "Conversion crashes on PNGs");
    expect(result).toBe(false);
  });

  it("returns false when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await submitFeedback("feedback", "test");
    expect(result).toBe(false);
  });

  it("POSTs to /api/bug with a feedback payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    await submitFeedback("feedback", "Great app");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/bug",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe("feedback");
    expect(body.message).toBe("Great app");
  });

  it("POSTs to /api/bug with a bug payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    await submitFeedback("bug", "Crashes on upload");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe("bug");
    expect(body.description).toBe("Crashes on upload");
  });

  it("does not send an Authorization header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    await submitFeedback("feedback", "test");
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("includes a screenshot when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    await submitFeedback("bug", "test", { screenshot: "data:image/png;base64,abc" });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.screenshot).toBe("data:image/png;base64,abc");
  });

  it("includes job params and error when a job state is provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    const jobState: LastJobState = { params, error: "boom", timestamp: "2026-06-20T00:00:00.000Z" };
    await submitFeedback("bug", "test", { jobState });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.jobParams).toEqual(params);
    expect(body.jobError).toBe("boom");
  });

  it("omits screenshot and job fields by default", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    await submitFeedback("feedback", "test");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.screenshot).toBeNull();
    expect(body.jobParams).toBeNull();
    expect(body.jobError).toBeNull();
  });
});

describe("readScreenshot", () => {
  it("resolves with a data URL for a small file", async () => {
    const file = new File(["fake-image-bytes"], "shot.png", { type: "image/png" });
    const result = await readScreenshot(file);
    expect(result).toMatch(/^data:/);
  });

  it("rejects files over the size limit", async () => {
    const big = new File([new Uint8Array(MAX_SCREENSHOT_BYTES + 1)], "shot.png", { type: "image/png" });
    await expect(readScreenshot(big)).rejects.toThrow(/4MB/);
  });
});
