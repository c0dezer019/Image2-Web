import { describe, expect, it, vi } from "vitest";
import { drawSampleScene } from "./sample-image";

function makeCtx() {
  return {
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
  };
}

describe("drawSampleScene", () => {
  it("paints sky, sun, and mountains", () => {
    const ctx = makeCtx();
    drawSampleScene(ctx as unknown as CanvasRenderingContext2D, 420, 300);

    expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(ctx.arc).toHaveBeenCalledTimes(1);
    expect(ctx.arc).toHaveBeenCalledWith(210, 126, 90, 0, Math.PI * 2);
  });
});
