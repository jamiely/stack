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
  const cycle = Math.max(0.12, input.motionSpeed) * 0.18;
  const climbProgress = (input.elapsedSeconds * cycle) % 1;
  const towerHeight = Math.max(input.topHeight * levels, input.topHeight * 3);
  const startY = input.topY - towerHeight;
  const y = startY + climbProgress * towerHeight;
  const aroundAngle = climbProgress * Math.PI * 2 * 1.8 + levels * 0.21;
  const radius = Math.max(0.8, input.baseRadius);

  return {
    x: input.topX + Math.cos(aroundAngle) * radius,
    y,
    z: input.topZ + Math.sin(aroundAngle) * radius,
  };
}
