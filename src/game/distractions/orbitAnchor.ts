export const DISTRACTION_ORBIT_VERTICAL_LAG_RATIO = 0.1;
export const DISTRACTION_ORBIT_MAX_LAG_LEVELS = 10;

export interface DistractionOrbitAnchorInput {
  anchorY: number;
  currentLevel: number;
  startLevel: number;
  slabHeight: number;
}

export function resolveDistractionOrbitAnchorY({
  anchorY,
  currentLevel,
  startLevel,
  slabHeight,
}: DistractionOrbitAnchorInput): number {
  const postStartLevels = Math.max(0, Math.min(DISTRACTION_ORBIT_MAX_LAG_LEVELS, currentLevel - startLevel));
  return anchorY - postStartLevels * slabHeight * DISTRACTION_ORBIT_VERTICAL_LAG_RATIO;
}
