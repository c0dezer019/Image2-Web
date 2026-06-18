export type OutputMode = "ascii" | "ansi";
export type AnsiPalette = "truecolor" | "256" | "bbs16";

export interface AsciiCell {
  ch: string;
  r: number;
  g: number;
  b: number;
}

export interface AsciiResult {
  cols: number;
  rows: number;
  cells: AsciiCell[][];
  text: string;
}

export interface AnsiCell {
  topR: number;
  topG: number;
  topB: number;
  botR: number;
  botG: number;
  botB: number;
}

export interface AnsiResult {
  cols: number;
  rows: number;
  cells: AnsiCell[][];
  ansiText: string;
}

/**
 * Auto-derived enhancement defaults for a given source image, from
 * `imgcommon.compute_auto_params` (image2 CLI's auto-detect-by-default
 * behavior). Sharpness is never auto-detected and is not included.
 */
export interface AutoParams {
  contrast: number;
  brightness: number;
  saturate: number;
  minLum: number;
}

export interface ConvertParams {
  mode: OutputMode;
  width: number;
  contrast: number;
  brightness: number;
  sharpness: number;
  saturate: number;
  minLum: number;
  fontSize: number;
  palette: AnsiPalette;
  imgWidth: number;
  imgHeight: number;
  invert: boolean;
  blur: number;
  /** Min mode (image2 CLI's `--min`): caps rendered font size to 8px. Ascii-only. */
  dense: boolean;
}

export interface HealthResponse {
  version: string;
  status: string;
  local: boolean;
}
