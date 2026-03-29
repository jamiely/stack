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

export function sampleGorillaClimbPosition(input: GorillaPathInput): { x: number; y: number; z: number } {
  const levels = Math.max(1, input.towerLevels);
  const slabHeight = Math.max(0.5, input.topHeight);
  const climbRate = Math.max(0.15, input.motionSpeed) * 0.48;
  const cycleProgress = (Math.max(0, input.elapsedSeconds) * climbRate) % 1;

  const totalClimbHeight = slabHeight * (levels - 1);
  const startY = input.topY - totalClimbHeight;
  const progressLevels = cycleProgress * levels;
  const levelIndex = Math.min(levels - 1, Math.floor(progressLevels));
  const levelLerp = progressLevels - levelIndex;
  const easedLerp = levelLerp * levelLerp * (3 - 2 * levelLerp);
  const y = startY + (levelIndex + easedLerp) * slabHeight;

  const sideIndex = levelIndex % 4;
  const sideProgress = easedLerp;
  const radius = Math.max(0.85, input.baseRadius);
  const span = radius * 2;

  switch (sideIndex) {
    case 0:
      return {
        x: input.topX - radius + span * sideProgress,
        y,
        z: input.topZ + radius,
      };
    case 1:
      return {
        x: input.topX + radius,
        y,
        z: input.topZ + radius - span * sideProgress,
      };
    case 2:
      return {
        x: input.topX + radius - span * sideProgress,
        y,
        z: input.topZ - radius,
      };
    default:
      return {
        x: input.topX - radius,
        y,
        z: input.topZ - radius + span * sideProgress,
      };
  }
}
