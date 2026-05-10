import { describe, expect, it } from "vitest";
import { computeRemyPlacementTransform, resolveRemyTargetHeight } from "../../src/game/characters/placementMath";
import type { RemyDebugConfig } from "../../src/game/characters/contracts";

const zeroPose: RemyDebugConfig = {
  yawDegrees: 0,
  pitchDegrees: 0,
  rollDegrees: 0,
  translateX: 0,
  translateY: 0,
  translateZ: 0,
};

describe("resolveRemyTargetHeight", () => {
  it("scales with slab height and clamps to configured bounds", () => {
    expect(resolveRemyTargetHeight(2, 0.42, 0.54, 1.28)).toBeCloseTo(0.84, 6);
    expect(resolveRemyTargetHeight(0.2, 0.42, 0.54, 1.28)).toBeCloseTo(0.54, 6);
    expect(resolveRemyTargetHeight(10, 0.42, 0.54, 1.28)).toBeCloseTo(1.28, 6);
  });
});

describe("computeRemyPlacementTransform", () => {
  it("computes scale, pose rotation, and world position on an unrotated ledge", () => {
    const result = computeRemyPlacementTransform({
      ledgePosition: { x: 10, y: 5, z: -3 },
      ledgeRotationY: 0,
      ledgeHeight: 0.4,
      ledgeDepth: 0.52,
      laneOffset: 0.2,
      baseHeight: 2,
      baseDepth: 1,
      targetHeight: 0.84,
      sidePose: {
        yawDegrees: 10,
        pitchDegrees: -3,
        rollDegrees: 6,
        translateX: 0.5,
        translateY: 0.1,
        translateZ: -0.2,
      },
      debugConfig: {
        yawDegrees: -2,
        pitchDegrees: 4,
        rollDegrees: -1,
        translateX: -0.1,
        translateY: 0.03,
        translateZ: 0.2,
      },
      ledgeInsetRatio: 0.14,
      wallClearance: 0.01,
      ledgeClearance: 0.03,
      rotationOffsetY: 0.25,
    });

    expect(result.uniformScale).toBeCloseTo(0.42, 6);
    expect(result.scaledDepth).toBeCloseTo(0.42, 6);
    expect(result.overlapIntoWall).toBeCloseTo(0, 6);
    expect(result.outwardOffset).toBeCloseTo(0.0828, 6);
    expect(result.poseRotationDegrees).toEqual({ x: 1, y: 8, z: 5 });
    expect(result.worldPosition.x).toBeCloseTo(10.6, 6);
    expect(result.worldPosition.y).toBeCloseTo(5.36, 6);
    expect(result.worldPosition.z).toBeCloseTo(-2.9172, 6);
    expect(result.facingRotationY).toBeCloseTo(0.25, 6);
  });

  it("rotates lane and outward offsets around the ledge yaw", () => {
    const result = computeRemyPlacementTransform({
      ledgePosition: { x: 3, y: 1, z: 7 },
      ledgeRotationY: Math.PI / 2,
      ledgeHeight: 0.5,
      ledgeDepth: 0.3,
      laneOffset: 0.4,
      baseHeight: 1,
      baseDepth: 1.2,
      targetHeight: 1,
      sidePose: zeroPose,
      debugConfig: zeroPose,
      ledgeInsetRatio: 0.14,
      wallClearance: 0.01,
      ledgeClearance: 0.03,
      rotationOffsetY: 0,
    });

    expect(result.uniformScale).toBeCloseTo(1, 6);
    expect(result.scaledDepth).toBeCloseTo(1.2, 6);
    expect(result.overlapIntoWall).toBeCloseTo(0.45, 6);
    expect(result.outwardOffset).toBeCloseTo(0.502, 6);
    expect(result.worldPosition.x).toBeCloseTo(3.502, 6);
    expect(result.worldPosition.y).toBeCloseTo(1.28, 6);
    expect(result.worldPosition.z).toBeCloseTo(6.6, 6);
    expect(result.facingRotationY).toBeCloseTo(Math.PI / 2, 6);
  });
});
