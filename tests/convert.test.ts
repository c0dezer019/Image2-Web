import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convertImage, getServerHealth, isLocalMode, fetchSession } from "../lib/convert";
import type { ConvertParams } from "../lib/types";

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

function mockFetchOk() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ cols: 1, rows: 1, cells: [[]], text: "", ansiText: "" }),
  });
}

describe("convertImage output-size clamping", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetchOk());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clamps ascii cols/rows derived from large imgWidth/imgHeight to server limits", async () => {
    await convertImage(new Blob(), {
      ...baseParams,
      imgWidth: 4000,
      imgHeight: 4000,
      fontSize: 2,
    });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const form = fetchMock.mock.calls[0][1].body as FormData;
    const width = Number(form.get("width"));
    const imgHeight = Number(form.get("img_height"));

    expect(width).toBeLessThanOrEqual(600);
    expect(imgHeight).toBeLessThanOrEqual(600);
    expect(width * imgHeight).toBeLessThanOrEqual(250_000);
  });

  it("leaves normal-sized ascii requests unchanged", async () => {
    await convertImage(new Blob(), {
      ...baseParams,
      imgWidth: 800,
      imgHeight: 450,
      fontSize: 6,
    });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const form = fetchMock.mock.calls[0][1].body as FormData;
    const width = Number(form.get("width"));
    const imgHeight = Number(form.get("img_height"));

    // 800 / (6 * 0.6) = 222, 450 / (6 * 1.12) = 67 — well within limits.
    expect(width).toBe(222);
    expect(imgHeight).toBe(67);
  });

  it("clamps the reported 2912x1632 image at default settings to within server limits", async () => {
    // Regression case: a 2912x1632 upload at the default width=100/fontSize=6
    // was reported as still 422'ing ("Output dimensions exceed server
    // limits") after the PR #11 clamp. charCellSize(6) -> charW=3.6, charH=6.72,
    // giving an unclamped grid of ~809x243 (196,587 cells) — over MAX_OUTPUT_COLS
    // but under MAX_OUTPUT_CELLS, so clampOutputSize scales it down to fit.
    await convertImage(new Blob(), {
      ...baseParams,
      imgWidth: 2912,
      imgHeight: 1632,
      fontSize: 6,
    });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const form = fetchMock.mock.calls[0][1].body as FormData;
    const width = Number(form.get("width"));
    const imgHeight = Number(form.get("img_height"));

    expect(width).toBeLessThanOrEqual(600);
    expect(imgHeight).toBeLessThanOrEqual(600);
    expect(width * imgHeight).toBeLessThanOrEqual(250_000);
  });

  it("clamps ansi width using the estimated row count from imgWidth/imgHeight", async () => {
    await convertImage(new Blob(), {
      ...baseParams,
      mode: "ansi",
      width: 1000,
      imgWidth: 1000,
      imgHeight: 4000,
    });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const form = fetchMock.mock.calls[0][1].body as FormData;
    const width = Number(form.get("width"));
    // estimatedRows = round((width * (4000/1000)) / 2) = width * 2
    const estimatedRows = width * 2;

    expect(width).toBeLessThanOrEqual(600);
    expect(estimatedRows).toBeLessThanOrEqual(600);
    expect(width * estimatedRows).toBeLessThanOrEqual(250_000);
  });

  it("does NOT clamp when server is in local mode", async () => {
    // First prime isLocalMode by calling getServerHealth with local:true
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ok", version: "1.0.0", local: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cols: 1, rows: 1, cells: [[]], text: "" }),
      })
    );
    await getServerHealth();

    await convertImage(new Blob(), {
      ...baseParams,
      imgWidth: 4000,
      imgHeight: 4000,
      fontSize: 2,
    });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    // Second call is convertImage; get its FormData
    const form = fetchMock.mock.calls[1][1].body as FormData;
    const width = Number(form.get("width"));
    const imgHeight = Number(form.get("img_height"));

    // With local mode, should NOT be clamped to 600
    expect(width).toBeGreaterThan(600);

    // Reset local mode so other tests are not affected
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok", version: "1.0.0", local: false }),
    }));
    await getServerHealth();
  });
});

describe("getServerHealth local mode", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns local: true and sets isLocalMode when server reports local", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", version: "1.0.0", local: true }),
    }));
    const result = await getServerHealth();
    expect(result.local).toBe(true);
    expect(isLocalMode()).toBe(true);
  });

  it("returns local: false and clears isLocalMode when server is cloud", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", version: "1.0.0", local: false }),
    }));
    const result = await getServerHealth();
    expect(result.local).toBe(false);
    expect(isLocalMode()).toBe(false);
  });

  it("defaults local to false when server omits the field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", version: "1.0.0" }),
    }));
    const result = await getServerHealth();
    expect(result.local).toBe(false);
  });
});

describe("fetchSession", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a blob for the given session id", async () => {
    const blob = new Blob(["data"], { type: "image/png" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, blob: async () => blob }));
    const result = await fetchSession("abc-123");
    expect(result).toBe(blob);
  });

  it("throws when session not found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchSession("bad-id")).rejects.toThrow("Session not found (404)");
  });
});
