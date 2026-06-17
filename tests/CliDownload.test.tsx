import { describe, it, expect } from "vitest";
import { detectPlatform } from "@/components/CliDownload";

describe("detectPlatform", () => {
  it("returns Windows asset for Windows UA", () => {
    const r = detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect(r?.label).toBe("Windows x86_64");
    expect(r?.url).toContain("windows-x86_64.exe");
    expect(r?.url).toContain("v1.2.2b");
  });

  it("returns amd64 deb for Linux x86_64 UA", () => {
    const r = detectPlatform("Mozilla/5.0 (X11; Linux x86_64)");
    expect(r?.label).toBe("Linux x86_64");
    expect(r?.url).toContain("amd64.deb");
    expect(r?.url).toContain("v1.2.2b");
  });

  it("returns arm64 deb for Linux aarch64 UA", () => {
    const r = detectPlatform("Mozilla/5.0 (X11; Linux aarch64)");
    expect(r?.label).toBe("Linux arm64");
    expect(r?.url).toContain("arm64.deb");
    expect(r?.url).toContain("v1.2.2b");
  });

  it("returns macOS arm64 for Mac UA", () => {
    const r = detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(r?.label).toBe("macOS (Apple Silicon)");
    expect(r?.url).toContain("macos-arm64");
    expect(r?.url).toContain("v1.2.2c");
  });

  it("returns null for unrecognized UA", () => {
    expect(detectPlatform("curl/7.81.0")).toBeNull();
  });

  it("returns null for iPad UA (not a macOS binary target)", () => {
    const r = detectPlatform(
      "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
    );
    expect(r).toBeNull();
  });

  it("returns null for iPhone UA (not a macOS binary target)", () => {
    const r = detectPlatform(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
    );
    expect(r).toBeNull();
  });
});
