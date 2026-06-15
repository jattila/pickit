export const MIN_FONT_SCALE_LEVEL = -3;
export const MAX_FONT_SCALE_LEVEL = 3;
const STEP = 0.1;

const LABEL_KEYS: Record<number, string> = {
  [-3]: "fontScale.verySmall",
  [-2]: "fontScale.small",
  [-1]: "fontScale.smaller",
  0: "fontScale.normal",
  1: "fontScale.larger",
  2: "fontScale.large",
  3: "fontScale.veryLarge",
};

export function clampFontScaleLevel(level: number): number {
  return Math.max(MIN_FONT_SCALE_LEVEL, Math.min(MAX_FONT_SCALE_LEVEL, Math.round(level)));
}

export function fontScaleMultiplier(level: number): number {
  return 1 + clampFontScaleLevel(level) * STEP;
}

export function scaleFontSize(baseSize: number, level: number): number {
  return Math.round(baseSize * fontScaleMultiplier(level) * 10) / 10;
}

export function fontScaleLabel(
  level: number,
  t: (key: string) => string
): string {
  const key = LABEL_KEYS[clampFontScaleLevel(level)] ?? "fontScale.normal";
  return t(key);
}
