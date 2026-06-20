import { describe, it, expect, beforeEach } from "vitest";
import { saveLastJobState, getLastJobState } from "@/lib/job-state";
import type { ConvertParams } from "@/lib/types";

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

describe("job-state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing has been saved", () => {
    expect(getLastJobState()).toBeNull();
  });

  it("round-trips saved params and error", () => {
    saveLastJobState(params, "boom");
    const state = getLastJobState();
    expect(state?.params).toEqual(params);
    expect(state?.error).toBe("boom");
    expect(typeof state?.timestamp).toBe("string");
  });

  it("stores null error for successful jobs", () => {
    saveLastJobState(params, null);
    expect(getLastJobState()?.error).toBeNull();
  });

  it("overwrites the previous job on each save", () => {
    saveLastJobState(params, "first");
    saveLastJobState({ ...params, width: 200 }, null);
    const state = getLastJobState();
    expect(state?.params.width).toBe(200);
    expect(state?.error).toBeNull();
  });
});
