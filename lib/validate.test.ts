import { describe, expect, it } from "vitest";
import { validateImageFile } from "./validate";

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("validateImageFile", () => {
  it("accepts a small PNG", () => {
    const result = validateImageFile(makeFile("a.png", "image/png", 1024));
    expect(result.ok).toBe(true);
  });

  it("rejects unsupported type", () => {
    const result = validateImageFile(makeFile("a.txt", "text/plain", 1024));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/PNG, JPG, GIF, or WebP/);
  });

  it("rejects files over 50MB", () => {
    const result = validateImageFile(makeFile("a.png", "image/png", 51 * 1024 * 1024));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/50MB/);
  });
});
