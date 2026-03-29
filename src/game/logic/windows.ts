export type WindowStyle = "rectangular" | "pointedGothic" | "roundedGothic" | "planter" | "shuttered";

export const WINDOW_STYLES: WindowStyle[] = ["rectangular", "pointedGothic", "roundedGothic", "planter", "shuttered"];

const WINDOW_MIN_FACE_SPAN = 0.86;
const SHUTTER_WINDOW_MIN_FACE_SPAN = 1.02;
const WINDOW_EDGE_PADDING_MULTIPLIER = 0.62;
const WINDOW_PAIR_GAP_MULTIPLIER = 1.18;

export function resolveWindowStyle(styleNoise: number, styles: readonly WindowStyle[] = WINDOW_STYLES): WindowStyle {
  if (styles.length === 0) {
    return "rectangular";
  }

  const normalizedNoise = clamp(styleNoise, 0, 0.999999);
  const index = Math.min(styles.length - 1, Math.floor(normalizedNoise * styles.length));
  return styles[index] ?? "rectangular";
}

export function resolveWindowCountForFace(
  faceSpan: number,
  style: WindowStyle,
  windowWidth: number,
  frameThickness: number,
  countNoise: number,
): number {
  const outerWidth = windowWidth + frameThickness * 2;
  const maxCountBySpan = Math.max(0, Math.min(7, Math.floor(faceSpan / 0.8)));
  const maxCountByFootprint = getMaxWindowCountByFootprint(faceSpan, style, outerWidth, frameThickness);
  const maxCount = Math.min(maxCountBySpan, maxCountByFootprint);
  if (maxCount < 1) {
    return 0;
  }

  const normalizedNoise = clamp(countNoise, 0, 0.999999);
  return Math.max(1, Math.min(maxCount, 1 + Math.floor(normalizedNoise * maxCount)));
}

export function shouldRenderWindowsForFace(
  span: number,
  style: WindowStyle,
  windowWidth: number,
  frameThickness: number,
): boolean {
  const outerWidth = windowWidth + frameThickness * 2;
  const minimumSpan = style === "shuttered" ? SHUTTER_WINDOW_MIN_FACE_SPAN : WINDOW_MIN_FACE_SPAN;
  const minimumFootprint = getWindowFootprintWidth(style, outerWidth, frameThickness);
  return span >= Math.max(minimumSpan, minimumFootprint);
}

export function getWindowHorizontalOffsets(
  span: number,
  count: number,
  style: WindowStyle,
  windowWidth: number,
  frameThickness: number,
): number[] {
  const outerWidth = windowWidth + frameThickness * 2;
  const footprint = getWindowFootprintWidth(style, outerWidth, frameThickness);
  const edgePadding = footprint * WINDOW_EDGE_PADDING_MULTIPLIER;
  if (count === 1) {
    return [0];
  }

  const available = Math.max(0, span - edgePadding * 2);
  const spacing = available / (count - 1);
  return Array.from({ length: count }, (_, index) => -available / 2 + spacing * index);
}

function getWindowFootprintWidth(style: WindowStyle, outerWidth: number, frameThickness: number): number {
  if (style !== "shuttered") {
    return outerWidth;
  }

  const shutterWidth = Math.max(frameThickness * 1.8, outerWidth * 0.22);
  return outerWidth + shutterWidth * 2;
}

function getMaxWindowCountByFootprint(
  span: number,
  style: WindowStyle,
  outerWidth: number,
  frameThickness: number,
): number {
  const footprint = getWindowFootprintWidth(style, outerWidth, frameThickness);
  const edgePadding = footprint * WINDOW_EDGE_PADDING_MULTIPLIER;
  const minimumPairGap = footprint * WINDOW_PAIR_GAP_MULTIPLIER;

  for (let count = 7; count >= 1; count -= 1) {
    const available = Math.max(0, span - edgePadding * 2);
    const spacing = count <= 1 ? available : available / (count - 1);
    const hasEdgeClearance = span >= edgePadding * 2 + footprint;
    const hasPairClearance = count <= 1 || spacing >= minimumPairGap;
    if (hasEdgeClearance && hasPairClearance) {
      return count;
    }
  }

  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
