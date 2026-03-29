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

  it("traces square side segments around the tower", () => {
    const input = {
      topX: 4,
      topY: 20,
      topZ: -2,
      topHeight: 2,
      towerLevels: 4,
      motionSpeed: 1,
      baseRadius: 1.5,
    };

    const side0 = sampleGorillaClimbPosition({ ...input, elapsedSeconds: 0.2 });
    const side1 = sampleGorillaClimbPosition({ ...input, elapsedSeconds: 0.7 });

    expect(side0.z).toBeGreaterThan(input.topZ + 1.4);
    expect(side1.x).toBeGreaterThan(input.topX + 1.4);
    expect(side1.y).toBeGreaterThanOrEqual(side0.y);
  });

  it("applies slab-height and radius minimum floors", () => {
    const sample = sampleGorillaClimbPosition({
      topX: 0,
      topY: 8,
      topZ: 0,
      topHeight: 0.1,
      towerLevels: 0,
      elapsedSeconds: 1,
      motionSpeed: 0,
      baseRadius: 0.1,
    });

    expect(Number.isFinite(sample.y)).toBe(true);
    expect(Math.hypot(sample.x, sample.z)).toBeGreaterThanOrEqual(0.8);
  });
});
