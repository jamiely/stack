export interface GorillaPathInput {
  topX: number;
  topY: number;
  topZ: number;
  topHeight: number;
  towerLevels: number;
  elapsedSeconds: number;
  motionSpeed: number;
  baseRadius: number;
}

const GORILLA_FACE_SWAY_RATIO = 0.68;
const GORILLA_VISIBLE_START_LEVELS_BELOW_TOP = 1.4;
const GORILLA_VISIBLE_END_LEVELS_ABOVE_TOP = 0.2;

export function sampleGorillaClimbPosition(input: GorillaPathInput): { x: number; y: number; z: number } {
  const slabHeight = Math.max(0.5, input.topHeight);
  const climbRate = Math.max(0.15, input.motionSpeed) * 0.22;
  const cycleProgress = (Math.max(0, input.elapsedSeconds) * climbRate) % 1;
  const easedProgress = cycleProgress * cycleProgress * (3 - 2 * cycleProgress);

  const startY = input.topY - slabHeight * GORILLA_VISIBLE_START_LEVELS_BELOW_TOP;
  const endY = input.topY + slabHeight * GORILLA_VISIBLE_END_LEVELS_ABOVE_TOP;
  const y = startY + easedProgress * (endY - startY);

  const radius = Math.max(0.85, input.baseRadius);
  const handholdPhase = cycleProgress * Math.PI * 2;
  const x = input.topX + Math.sin(handholdPhase) * radius * GORILLA_FACE_SWAY_RATIO;
  const z = input.topZ + radius;

  return { x, y, z };
}
