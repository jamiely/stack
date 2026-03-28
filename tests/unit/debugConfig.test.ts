import { describe, expect, it } from "vitest";
import { clampDebugConfig, defaultDebugConfig } from "../../src/game/debugConfig";

describe("clampDebugConfig", () => {
  it("preserves values inside the accepted range", () => {
    expect(clampDebugConfig(defaultDebugConfig)).toEqual(defaultDebugConfig);
  });

  it("clamps out-of-range numeric values", () => {
    expect(
      clampDebugConfig({
        cameraHeight: 99,
        cameraDistance: 2,
        cameraLerp: 0.7,
        baseWidth: 12,
        baseDepth: 1,
        slabHeight: 4,
        motionRange: -5,
        motionSpeed: 7,
        speedRamp: 9,
        perfectTolerance: 1,
        comboTarget: 99,
        recoveryGrowthMultiplier: 2,
        recoverySlowdownFactor: 0,
        recoverySlowdownPlacements: 99,
        prebuiltLevels: 99,
        debrisLifetime: 0.1,
        debrisTumbleSpeed: -1,
        gridVisible: true,
      }),
    ).toEqual({
      cameraHeight: 20,
      cameraDistance: 7,
      cameraLerp: 0.25,
      baseWidth: 8,
      baseDepth: 2,
      slabHeight: 2,
      motionRange: 1,
      motionSpeed: 5,
      speedRamp: 0.8,
      perfectTolerance: 0.5,
      comboTarget: 12,
      recoveryGrowthMultiplier: 1.5,
      recoverySlowdownFactor: 0.25,
      recoverySlowdownPlacements: 8,
      prebuiltLevels: 8,
      debrisLifetime: 0.4,
      debrisTumbleSpeed: 0.2,
      gridVisible: true,
    });
  });
});
