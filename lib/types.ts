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
}
