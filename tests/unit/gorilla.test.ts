import { describe, expect, it } from "vitest";
import { sampleGorillaClimbPosition } from "../../src/game/logic/gorilla";

describe("gorilla climb path", () => {
  it("climbs up tower height over time while orbiting", () => {
    const a = sampleGorillaClimbPosition({
      topX: 0,
      topY: 24,
      topZ: 0,
      topHeight: 3,
      towerLevels: 10,
      elapsedSeconds: 1,
      motionSpeed: 1,
      baseRadius: 2,
    });

    const b = sampleGorillaClimbPosition({
      topX: 0,
      topY: 24,
      topZ: 0,
      topHeight: 3,
      towerLevels: 10,
      elapsedSeconds: 2,
      motionSpeed: 1,
      baseRadius: 2,
    });

    expect(b.y).toBeGreaterThan(a.y);
    expect(Math.hypot(a.x, a.z)).toBeGreaterThan(1.5);
  });
});
