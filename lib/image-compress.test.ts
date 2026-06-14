import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImageIfNeeded, computeScaledDimensions, nextQuality, withJpegExtension } from "./image-compress";

describe("computeScaledDimensions", () => {
  it("leaves dimensions unchanged when within the max", () => {
    expect(computeScaledDimensions(2000, 1500, 4096)).toEqual({ width: 2000, height: 1500 });
  });

  it("scales down a wide image to fit the max on its longest side", () => {
    expect(computeScaledDimensions(8000, 6000, 4096)).toEqual({ width: 4096, height: 3072 });
  });

  it("scales down a tall image to fit the max on its longest side", () => {
    expect(computeScaledDimensions(3000, 5000, 4096)).toEqual({ width: 2458, height: 4096 });
  });
});

describe("nextQuality", () => {
  it("steps down by 0.1", () => {
    expect(nextQuality(0.92)).toBe(0.82);
  });

  it("returns the floor value when stepping lands exactly on it", () => {
    expect(nextQuality(0.6)).toBe(0.5);
  });

  it("returns null once below the 0.5 floor", () => {
    expect(nextQuality(0.52)).toBeNull();
  });
});

describe("withJpegExtension", () => {
  it("replaces an existing extension with .jpg", () => {
    expect(withJpegExtension("photo.png")).toBe("photo.jpg");
  });

  it("appends .jpg when there is no extension", () => {
    expect(withJpegExtension("photo")).toBe("photo.jpg");
  });
});

type SizeFn = (width: number, height: number, mime?: string, quality?: number) => number;

class MockCanvas {
  width = 0;
  height = 0;
  constructor(private sizeFn: SizeFn, private calls: Array<{ mime?: string; quality?: number }>) {}
  getContext() {
    return { drawImage: vi.fn() };
  }
  toBlob(cb: (blob: Blob | null) => void, mime?: string, quality?: number) {
    this.calls.push({ mime, quality });
    const size = this.sizeFn(this.width, this.height, mime, quality);
    cb(new Blob([new Uint8Array(size)], { type: mime }));
  }
}

function stubCanvas(sizeFn: SizeFn) {
  const calls: Array<{ mime?: string; quality?: number }> = [];
  const realCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") return new MockCanvas(sizeFn, calls) as unknown as HTMLElement;
    return realCreateElement(tag);
  });
  return calls;
}

function stubImage(naturalWidth: number, naturalHeight: number, shouldError = false) {
  class MockImage {
    naturalWidth = 0;
    naturalHeight = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      if (shouldError) {
        queueMicrotask(() => this.onerror?.());
      } else {
        this.naturalWidth = naturalWidth;
        this.naturalHeight = naturalHeight;
        queueMicrotask(() => this.onload?.());
      }
    }
  }
  vi.stubGlobal("Image", MockImage);
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
}

function bigFile(name: string, type: string): File {
  return new File([new Uint8Array(11 * 1024 * 1024)], name, { type });
}

describe("compressImageIfNeeded", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns the file unchanged when already under the target size", async () => {
    const file = new File([new Uint8Array(1024)], "small.jpg", { type: "image/jpeg" });
    const result = await compressImageIfNeeded(file);
    expect(result).toBe(file);
  });

  it("scales an oversized image and succeeds at the initial quality", async () => {
    stubImage(8000, 6000);
    stubCanvas((w, h) => Math.round(w * h * 0.5));

    const file = bigFile("photo.jpg", "image/jpeg");
    const result = await compressImageIfNeeded(file);

    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("photo.jpg");
    expect(result.size).toBe(Math.round(4096 * 3072 * 0.5));
  });

  it("steps quality down when scaling alone isn't enough", async () => {
    stubImage(2000, 1500);
    const calls = stubCanvas((w, h, mime, quality) => Math.round(w * h * (quality ?? 1) * 4));

    const file = bigFile("photo.jpg", "image/jpeg");
    const result = await compressImageIfNeeded(file);

    expect(result.size).toBe(Math.round(2000 * 1500 * 0.82 * 4));
    expect(calls.map((c) => c.quality)).toEqual([0.92, 0.82]);
  });

  it("falls back to JPEG when a PNG can't be compressed enough via quality", async () => {
    stubImage(2000, 1500);
    stubCanvas((w, h, mime, quality) => {
      if (mime === "image/png") return w * h * 8;
      return Math.round(w * h * (quality ?? 1) * 2);
    });

    const file = bigFile("photo.png", "image/png");
    const result = await compressImageIfNeeded(file);

    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("photo.jpg");
    expect(result.size).toBe(Math.round(2000 * 1500 * 0.92 * 2));
  });

  it("returns the best-effort result if the target is never reached", async () => {
    stubImage(5000, 5000);
    // Just over TARGET_BYTES, never succeeds — exercises all MAX_SCALE_ROUNDS.
    // Kept close to TARGET_BYTES (rather than e.g. 50MB) since this size is
    // allocated repeatedly (5 rounds x up to 5 quality steps).
    stubCanvas(() => 11_000_000);

    const file = bigFile("photo.jpg", "image/jpeg");
    const result = await compressImageIfNeeded(file);

    expect(result).toBeInstanceOf(File);
    expect(result.size).toBe(11_000_000);
  });

  it("rejects when the image fails to decode", async () => {
    stubImage(0, 0, true);
    const file = bigFile("bad.jpg", "image/jpeg");

    await expect(compressImageIfNeeded(file)).rejects.toThrow("Could not read image for compression");
  });
});
