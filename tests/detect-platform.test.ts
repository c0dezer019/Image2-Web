import { describe, it, expect } from "vitest";
import { detectPlatform, type ReleaseAssets } from "@/lib/detect-platform";

const MOCK: ReleaseAssets = {
  windows: "https://example.com/img2-windows.exe",
  linuxAmd64: "https://example.com/img2-amd64.deb",
  linuxArm64: "https://example.com/img2-arm64.deb",
  macArm64: "https://example.com/img2-macos-arm64",
  macX64: "https://example.com/img2-macos-x86_64",
};

describe("detectPlatform", () => {
  it("returns Windows asset for Windows UA", () => {
    const r = detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", MOCK);
    expect(r?.label).toBe("Windows x86_64");
    expect(r?.url).toBe(MOCK.windows);
  });

  it("returns amd64 deb for Linux x86_64 UA", () => {
    const r = detectPlatform("Mozilla/5.0 (X11; Linux x86_64)", MOCK);
    expect(r?.label).toBe("Linux x86_64");
    expect(r?.url).toBe(MOCK.linuxAmd64);
  });

  it("returns arm64 deb for Linux aarch64 UA", () => {
    const r = detectPlatform("Mozilla/5.0 (X11; Linux aarch64)", MOCK);
    expect(r?.label).toBe("Linux arm64");
    expect(r?.url).toBe(MOCK.linuxArm64);
  });

  it("returns macOS arm64 for Macintosh UA", () => {
    const r = detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", MOCK);
    expect(r?.label).toBe("macOS (Apple Silicon)");
    expect(r?.url).toBe(MOCK.macArm64);
  });

  it("returns null for unrecognized UA", () => {
    expect(detectPlatform("curl/7.81.0", MOCK)).toBeNull();
  });

  it("returns null for iPad UA", () => {
    expect(
      detectPlatform("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15", MOCK)
    ).toBeNull();
  });

  it("returns null for iPhone UA", () => {
    expect(
      detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15", MOCK)
    ).toBeNull();
  });
});
