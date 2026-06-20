import { describe, it, expect } from "vitest";
import { getBrowserInfo } from "@/lib/browser-info";

describe("getBrowserInfo", () => {
  it("identifies Chrome on Windows", () => {
    expect(getBrowserInfo("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"))
      .toBe("Chrome on Windows");
  });

  it("identifies Firefox on Linux", () => {
    expect(getBrowserInfo("Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0"))
      .toBe("Firefox on Linux");
  });

  it("identifies Safari on macOS", () => {
    expect(getBrowserInfo("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15"))
      .toBe("Safari on macOS");
  });

  it("identifies Edge on Windows", () => {
    expect(getBrowserInfo("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36 Edg/124.0"))
      .toBe("Edge on Windows");
  });

  it("identifies Safari on iOS", () => {
    expect(getBrowserInfo("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Safari/605.1.15"))
      .toBe("Safari on iOS");
  });

  it("falls back to unknowns for unrecognized UA", () => {
    expect(getBrowserInfo("curl/7.81.0")).toBe("Unknown browser on Unknown OS");
  });
});
