import { describe, expect, it } from "vitest";
import { computeScaledDimensions, nextQuality, withJpegExtension } from "./image-compress";

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
