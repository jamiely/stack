import type { RemyPlacementTransformInput, RemyPlacementTransformResult } from "./contracts";

function rotateAroundY(x: number, z: number, angleRadians: number): { x: number; z: number } {
  const cosine = Math.cos(angleRadians);
  const sine = Math.sin(angleRadians);

  return {
    x: x * cosine + z * sine,
    z: -x * sine + z * cosine,
  };
}

export function resolveRemyTargetHeight(
  slabHeight: number,
  targetHeightRatio: number,
  minHeight: number,
  maxHeight: number,
): number {
  return Math.min(maxHeight, Math.max(minHeight, slabHeight * targetHeightRatio));
}

export function computeRemyPlacementTransform(input: RemyPlacementTransformInput): RemyPlacementTransformResult {
  const uniformScale = input.targetHeight / Math.max(0.001, input.baseHeight);
  const scaledDepth = input.baseDepth * uniformScale;
  const overlapIntoWall = Math.max(0, (scaledDepth - input.ledgeDepth) / 2);
  const outwardOffset = input.ledgeDepth * input.ledgeInsetRatio + overlapIntoWall + input.wallClearance;

  const localX = input.laneOffset + input.sidePose.translateX + input.debugConfig.translateX;
  const localY = input.sidePose.translateY + input.debugConfig.translateY;
  const localZ = outwardOffset + input.sidePose.translateZ + input.debugConfig.translateZ;
  const rotated = rotateAroundY(localX, localZ, input.ledgeRotationY);

  return {
    uniformScale,
    scaledDepth,
    overlapIntoWall,
    outwardOffset,
    poseRotationDegrees: {
      x: input.sidePose.pitchDegrees + input.debugConfig.pitchDegrees,
      y: input.sidePose.yawDegrees + input.debugConfig.yawDegrees,
      z: input.sidePose.rollDegrees + input.debugConfig.rollDegrees,
    },
    worldPosition: {
      x: input.ledgePosition.x + rotated.x,
      y: input.ledgePosition.y + input.ledgeHeight / 2 + input.ledgeClearance + localY,
      z: input.ledgePosition.z + rotated.z,
    },
    facingRotationY: input.ledgeRotationY + input.rotationOffsetY,
  };
}
