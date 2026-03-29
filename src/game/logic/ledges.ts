export interface LedgeDimensions {
  widthRatio: number;
  ledgeWidth: number;
  ledgeHeight: number;
  ledgeDepth: number;
  lipHeight: number;
  lipDepth: number;
}

export interface LedgeAnimationFrame {
  scaleX: number;
  completed: boolean;
}

const LEDGE_MIN_WIDTH_RATIO = 0.25;
const LEDGE_MAX_WIDTH_RATIO = 1;
const LEDGE_MIN_WIDTH = 0.24;
const LEDGE_MIN_HEIGHT = 0.1;
const LEDGE_DEPTH_MIN = 0.24;
const LEDGE_DEPTH_MAX = 0.52;
const LEDGE_DEPTH_HEIGHT_MULTIPLIER = 0.18;
const LIP_DEPTH_MIN = 0.06;
const LIP_DEPTH_MULTIPLIER = 0.22;
const LIP_HEIGHT_MULTIPLIER = 0.34;
const LEDGE_MIN_SCALE = 0.01;

export const LEDGE_ANIMATION_DURATION_SECONDS = 0.3;

export function resolveLedgeFaceIndex(visibleFaceCount: number, faceNoise: number): number | null {
  if (visibleFaceCount <= 0) {
    return null;
  }

  const normalizedNoise = clamp(faceNoise, 0, 0.999999);
  return Math.min(visibleFaceCount - 1, Math.floor(normalizedNoise * visibleFaceCount));
}

export function resolveLedgeDimensions(faceSpan: number, slabHeight: number, widthNoise: number): LedgeDimensions {
  const normalizedWidthNoise = clamp(widthNoise, 0, 1);
  const widthRatio = LEDGE_MIN_WIDTH_RATIO + normalizedWidthNoise * (LEDGE_MAX_WIDTH_RATIO - LEDGE_MIN_WIDTH_RATIO);

  const ledgeHeight = Math.max(LEDGE_MIN_HEIGHT, slabHeight * 0.1);
  const ledgeDepth = Math.max(LEDGE_DEPTH_MIN, Math.min(LEDGE_DEPTH_MAX, slabHeight * LEDGE_DEPTH_HEIGHT_MULTIPLIER));
  const lipHeight = ledgeHeight * LIP_HEIGHT_MULTIPLIER;
  const lipDepth = Math.max(LIP_DEPTH_MIN, ledgeDepth * LIP_DEPTH_MULTIPLIER);

  return {
    widthRatio,
    ledgeWidth: Math.max(LEDGE_MIN_WIDTH, faceSpan * widthRatio),
    ledgeHeight,
    ledgeDepth,
    lipHeight,
    lipDepth,
  };
}

export function sampleLedgeAnimationScaleX(elapsedSeconds: number, durationSeconds: number, targetScaleX: number): LedgeAnimationFrame {
  const safeDuration = Math.max(0, durationSeconds);
  const clampedElapsed = Math.max(0, elapsedSeconds);

  const progress = safeDuration <= 0 ? 1 : Math.min(1, clampedElapsed / safeDuration);
  const eased = 1 - Math.pow(1 - progress, 3);
  const scaleX = Math.max(LEDGE_MIN_SCALE, targetScaleX * eased);

  return {
    scaleX,
    completed: progress >= 1,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
