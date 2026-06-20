import { describe, it, expect, vi, afterEach } from "vitest";
import { submitFeedback } from "../lib/feedback";

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
});
