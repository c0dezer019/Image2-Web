import { describe, expect, it, vi } from "vitest";
import { charCellSize, drawAsciiGrid, drawAnsiGrid } from "./canvas-render";
import type { AnsiResult, AsciiResult } from "./types";

function makeCtx() {
  return {
    canvas: { width: 0, height: 0 },
    fillRect: vi.fn(),
    fillText: vi.fn(),
    fillStyle: "",
    font: "",
    textBaseline: "",
  };
}

describe("charCellSize", () => {
  it("scales with font size", () => {
    expect(charCellSize(10)).toEqual({ w: 6, h: 11.2 });
  });
});

describe("drawAsciiGrid", () => {
  const result: AsciiResult = {
    cols: 2,
    rows: 2,
    cells: [
      [{ ch: "A", r: 255, g: 0, b: 0 }, { ch: " ", r: 0, g: 255, b: 0 }],
      [{ ch: "B", r: 0, g: 0, b: 255 }, { ch: "C", r: 1, g: 2, b: 3 }],
    ],
    text: "A \nBC",
  };

  it("sizes the canvas and skips space glyphs", () => {
    const ctx = makeCtx();
    drawAsciiGrid(ctx as unknown as CanvasRenderingContext2D, result, 10);

    const { w, h } = charCellSize(10);
    expect(ctx.canvas.width).toBe(Math.round(2 * w));
    expect(ctx.canvas.height).toBe(Math.round(2 * h));
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).toHaveBeenCalledTimes(3);
    expect(ctx.fillText).toHaveBeenCalledWith("A", 0, 0);
    expect(ctx.fillText).toHaveBeenCalledWith("B", 0, h);
    expect(ctx.fillText).toHaveBeenCalledWith("C", w, h);
  });
});

describe("drawAnsiGrid", () => {
  const result: AnsiResult = {
    cols: 2,
    rows: 1,
    cells: [
      [
        { topR: 255, topG: 0, botR: 0, botG: 255, topB: 0, botB: 0 },
        { topR: 0, topG: 0, topB: 255, botR: 255, botG: 255, botB: 255 },
      ],
    ],
    ansiText: "",
  };

  it("sizes the canvas and fills top/bottom halves per cell", () => {
    const ctx = makeCtx();
    drawAnsiGrid(ctx as unknown as CanvasRenderingContext2D, result, 10);

    const { w, h } = charCellSize(10);
    expect(ctx.canvas.width).toBe(Math.round(2 * w));
    expect(ctx.canvas.height).toBe(Math.round(1 * h));
    expect(ctx.fillRect).toHaveBeenCalledTimes(4);
  });
});
