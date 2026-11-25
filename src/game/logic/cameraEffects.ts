const MOBILE_PORTRAIT_MAX_ASPECT = 0.75;
const MOBILE_PORTRAIT_CAMERA_PULLBACK = 6;
const DEFAULT_CAMERA_DISTANCE = 12;
export const BASE_CAMERA_FOV = 50;
// Narrower than square, the vertical FOV widens so the horizontal view keeps the slab's full travel in frame.
const MIN_HORIZONTAL_ASPECT = 1;

/** Vertical FOV that keeps a tall (portrait) viewport as wide as a square one; landscape keeps the base FOV. */
export function resolveResponsiveCameraFov(viewportAspect: number): number {
  if (!Number.isFinite(viewportAspect) || viewportAspect <= 0 || viewportAspect >= MIN_HORIZONTAL_ASPECT) {
    return BASE_CAMERA_FOV;
  }
  const halfTan = Math.tan((BASE_CAMERA_FOV * Math.PI) / 360) * (MIN_HORIZONTAL_ASPECT / viewportAspect);
  return (Math.atan(halfTan) * 360) / Math.PI;
}

export function resolveResponsiveCameraDistance(configuredDistance: number, viewportAspect: number): number {
  const safeDistance = Number.isFinite(configuredDistance) ? configuredDistance : DEFAULT_CAMERA_DISTANCE;

  return Number.isFinite(viewportAspect) && viewportAspect > 0 && viewportAspect <= MOBILE_PORTRAIT_MAX_ASPECT
    ? safeDistance + MOBILE_PORTRAIT_CAMERA_PULLBACK
    : safeDistance;
}

export function resolveCharacterFramingLookAtX(characterWorldX: number | null, viewportAspect: number): number {
  if (characterWorldX === null || !Number.isFinite(characterWorldX) || !Number.isFinite(viewportAspect)) {
    return 0;
  }

  const narrowScreenFactor = Math.max(0, Math.min(1, (0.75 - viewportAspect) / 0.25));
  const outsideTowerOffset = Math.max(0, Math.abs(characterWorldX) - 2.5);
  return Math.sign(characterWorldX) * Math.min(2.5, outsideTowerOffset) * narrowScreenFactor;
}

export function sampleTremorCameraShake(
  elapsedSeconds: number,
  tremorStrength: number,
  verticalMagnitude = 1,
): { x: number; y: number } {
  if (tremorStrength <= 0 || verticalMagnitude <= 0) {
    return { x: 0, y: 0 };
  }

  const shakePhase = elapsedSeconds * 58;
  return {
    x: Math.sin(shakePhase) * 0.03 * tremorStrength,
    y: Math.cos(shakePhase * 0.9) * 0.06 * tremorStrength * verticalMagnitude,
  };
}

export function samplePlacementCameraShake(
  elapsedSeconds: number,
  remainingSeconds: number,
  durationSeconds: number,
  amount: number,
): { x: number; y: number; z: number } {
  if (remainingSeconds <= 0 || durationSeconds <= 0 || amount <= 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const shakeStrength = (remainingSeconds / durationSeconds) * amount;
  const shakePhase = elapsedSeconds * 78;
  return {
    x: Math.sin(shakePhase) * 0.08 * shakeStrength,
    y: Math.cos(shakePhase * 1.1) * 0.06 * shakeStrength,
    z: Math.sin(shakePhase * 0.9) * 0.04 * shakeStrength,
  };
}
