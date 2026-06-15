import { afterEach, describe, expect, it, vi } from "vitest";
import { getImageDimensions } from "../lib/image-dimensions";

class MockImage {
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = "";

  set src(value: string) {
    this._src = value;
    if (value === "blob:bad") {
      queueMicrotask(() => this.onerror?.());
    } else {
      this.naturalWidth = 640;
      this.naturalHeight = 480;
      queueMicrotask(() => this.onload?.());
    }
  }

  get src() {
    return this._src;
  }
}

describe("getImageDimensions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves the natural width/height of the image", async () => {
    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:ok"), revokeObjectURL: vi.fn() });

    const dims = await getImageDimensions(new Blob());
    expect(dims).toEqual({ width: 640, height: 480 });
  });

  it("rejects when the image fails to load", async () => {
    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:bad"), revokeObjectURL: vi.fn() });

    await expect(getImageDimensions(new Blob())).rejects.toThrow("Could not read image dimensions");
  });
});
