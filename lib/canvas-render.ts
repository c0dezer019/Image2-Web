import { BG_HEX, FONT_MONO } from "./theme";
import type { AnsiResult, AsciiResult } from "./types";

export function charCellSize(fontSize: number): { w: number; h: number } {
  const w = Math.round(fontSize * 0.6 * 100) / 100;
  const h = Math.round(fontSize * 1.12 * 100) / 100;
  return { w, h };
}

export function drawAsciiGrid(
  ctx: CanvasRenderingContext2D,
  result: AsciiResult,
  fontSize: number,
): void {
  const { w: charW, h: charH } = charCellSize(fontSize);
  ctx.canvas.width = Math.round(result.cols * charW);
  ctx.canvas.height = Math.round(result.rows * charH);

  ctx.fillStyle = BG_HEX;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.font = `${fontSize}px ${FONT_MONO}`;
  ctx.textBaseline = "top";

  result.cells.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell.ch === " ") return;
      ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`;
      ctx.fillText(cell.ch, x * charW, y * charH);
    });
  });
}

export function drawAnsiGrid(
  ctx: CanvasRenderingContext2D,
  result: AnsiResult,
  fontSize: number,
): void {
  const { w: cellW, h: cellH } = charCellSize(fontSize);
  const halfH = cellH / 2;
  ctx.canvas.width = Math.round(result.cols * cellW);
  ctx.canvas.height = Math.round(result.rows * cellH);

  result.cells.forEach((row, y) => {
    row.forEach((cell, x) => {
      ctx.fillStyle = `rgb(${cell.topR},${cell.topG},${cell.topB})`;
      ctx.fillRect(x * cellW, y * cellH, cellW, halfH);
      ctx.fillStyle = `rgb(${cell.botR},${cell.botG},${cell.botB})`;
      ctx.fillRect(x * cellW, y * cellH + halfH, cellW, halfH);
    });
  });
}
