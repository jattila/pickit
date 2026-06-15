export const MIN_FONT_SCALE_LEVEL = -3;
export const MAX_FONT_SCALE_LEVEL = 3;
const STEP = 0.1;

export function clampFontScaleLevel(level: number): number {
  return Math.max(MIN_FONT_SCALE_LEVEL, Math.min(MAX_FONT_SCALE_LEVEL, Math.round(level)));
}

export function fontScaleMultiplier(level: number): number {
  return 1 + clampFontScaleLevel(level) * STEP;
}

export function scaleFontSize(baseSize: number, level: number): number {
  return Math.round(baseSize * fontScaleMultiplier(level) * 10) / 10;
}

const LABELS: Record<number, string> = {
  [-3]: "Nagyon kicsi",
  [-2]: "Kicsi",
  [-1]: "Kisebb",
  0: "Normál",
  1: "Nagyobb",
  2: "Nagy",
  3: "Nagyon nagy",
};

export function fontScaleLabel(level: number): string {
  return LABELS[clampFontScaleLevel(level)] ?? "Normál";
}
