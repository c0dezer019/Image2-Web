import { describe, expect, it } from "vitest";
import { ASPECT_RATIO_PRESETS, heightForWidth, widthForHeight } from "./aspect-ratio";

describe("heightForWidth", () => {
  it("computes height from width and ratio", () => {
    expect(heightForWidth(1600, 16 / 9)).toBe(900);
  });

  it("rounds to the nearest integer", () => {
    expect(heightForWidth(100, 3)).toBe(33);
  });

  it("returns 0 for a non-positive ratio", () => {
    expect(heightForWidth(100, 0)).toBe(0);
    expect(heightForWidth(100, -1)).toBe(0);
  });
});

describe("widthForHeight", () => {
  it("computes width from height and ratio", () => {
    expect(widthForHeight(900, 16 / 9)).toBe(1600);
  });

  it("rounds to the nearest integer", () => {
    expect(widthForHeight(100, 1 / 3)).toBe(33);
  });

  it("returns 0 for a non-positive ratio", () => {
    expect(widthForHeight(100, 0)).toBe(0);
    expect(widthForHeight(100, -1)).toBe(0);
  });
});

describe("ASPECT_RATIO_PRESETS", () => {
  it("starts with Original (ratio null, resolved against the source image)", () => {
    expect(ASPECT_RATIO_PRESETS[0]).toEqual({ label: "Original", ratio: null });
  });

  it("has 9 presets", () => {
    expect(ASPECT_RATIO_PRESETS).toHaveLength(9);
  });

  it("includes the documented ratios", () => {
    const byLabel = Object.fromEntries(ASPECT_RATIO_PRESETS.map((p) => [p.label, p.ratio]));
    expect(byLabel["1:1"]).toBeCloseTo(1);
    expect(byLabel["4:3"]).toBeCloseTo(4 / 3);
    expect(byLabel["3:2"]).toBeCloseTo(3 / 2);
    expect(byLabel["16:9"]).toBeCloseTo(16 / 9);
    expect(byLabel["9:16"]).toBeCloseTo(9 / 16);
    expect(byLabel["5:4"]).toBeCloseTo(5 / 4);
    expect(byLabel["21:9"]).toBeCloseTo(21 / 9);
    expect(byLabel["2:3"]).toBeCloseTo(2 / 3);
  });
});
