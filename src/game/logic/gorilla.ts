export interface GorillaPathInput {
  topX: number;
  topY: number;
  topZ: number;
  topHeight: number;
  towerLevels: number;
  elapsedSeconds: number;
  motionSpeed: number;
  baseRadius: number;
  actorHeight?: number;
}

const GORILLA_FACE_SWAY_RATIO = 0.68;
const GORILLA_VISIBLE_START_LEVELS_BELOW_TOP = 1.4;
const GORILLA_VISIBLE_END_LEVELS_ABOVE_TOP = 0.2;
const GORILLA_TOP_EAVE_CLEARANCE = 0.08;
const GORILLA_EAVE_MIN_HEIGHT = 0.44;
const GORILLA_EAVE_MAX_HEIGHT = 0.78;
const GORILLA_EAVE_HEIGHT_TO_SLAB_RATIO = 0.26;
const GORILLA_EAVE_LOWER_EDGE_RATIO = 0.92;

function resolveTopEaveLowerY(topY: number, slabHeight: number): number {
  const eaveHeight = Math.max(
    GORILLA_EAVE_MIN_HEIGHT,
    Math.min(GORILLA_EAVE_MAX_HEIGHT, slabHeight * GORILLA_EAVE_HEIGHT_TO_SLAB_RATIO),
  );
  return topY + slabHeight / 2 - eaveHeight * GORILLA_EAVE_LOWER_EDGE_RATIO;
}

function resolveGorillaEndY(input: GorillaPathInput, slabHeight: number): number {
  const defaultEndY = input.topY + slabHeight * GORILLA_VISIBLE_END_LEVELS_ABOVE_TOP;
  const actorHeight = Number.isFinite(input.actorHeight) ? Math.max(0, input.actorHeight ?? 0) : 0;
  if (actorHeight <= 0) {
    return defaultEndY;
  }

  const eaveLimitedEndY = resolveTopEaveLowerY(input.topY, slabHeight) - actorHeight - GORILLA_TOP_EAVE_CLEARANCE;
  return Math.min(defaultEndY, eaveLimitedEndY);
}

export function sampleGorillaClimbPosition(input: GorillaPathInput): { x: number; y: number; z: number } {
  const slabHeight = Math.max(0.5, input.topHeight);
  const climbRate = Math.max(0.15, input.motionSpeed) * 0.22;
  const rawCycleProgress = (Math.max(0, input.elapsedSeconds) * climbRate) % 2;
  const verticalProgress = rawCycleProgress <= 1 ? rawCycleProgress : 2 - rawCycleProgress;
  const easedProgress = verticalProgress * verticalProgress * (3 - 2 * verticalProgress);

  const startY = input.topY - slabHeight * GORILLA_VISIBLE_START_LEVELS_BELOW_TOP;
  const endY = resolveGorillaEndY(input, slabHeight);
  const y = startY + easedProgress * (endY - startY);

  const radius = Math.max(0.85, input.baseRadius);
  const handholdPhase = Math.max(0, input.elapsedSeconds) * climbRate * Math.PI * 2;
  const x = input.topX + Math.sin(handholdPhase) * radius * GORILLA_FACE_SWAY_RATIO;
  const z = input.topZ + radius;

  return { x, y, z };
}
