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
        motionRange: -5,
        motionSpeed: 7,
        gridVisible: true,
      }),
    ).toEqual({
      cameraHeight: 20,
      cameraDistance: 7,
      cameraLerp: 0.25,
      motionRange: 1,
      motionSpeed: 3,
      gridVisible: true,
    });
  });
});
