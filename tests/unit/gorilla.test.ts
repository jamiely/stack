import { describe, expect, it } from "vitest";
import { sampleGorillaClimbPosition } from "../../src/game/logic/gorilla";

describe("gorilla climb path", () => {
  it("climbs within the visible top facade instead of traversing the full tower height", () => {
    const input = {
      topX: 0,
      topY: 48,
      topZ: 0,
      topHeight: 3,
      towerLevels: 16,
      motionSpeed: 1,
      baseRadius: 4.2,
    };

    const samples = [0, 1, 2, 3, 4].map((elapsedSeconds) => sampleGorillaClimbPosition({ ...input, elapsedSeconds }));

    samples.forEach((sample) => {
      expect(sample.y).toBeGreaterThanOrEqual(input.topY - input.topHeight * 1.4);
      expect(sample.y).toBeLessThanOrEqual(input.topY + input.topHeight * 0.2);
    });
    expect(samples[2].y).toBeGreaterThan(samples[0].y);
  });

  it("stays on one camera-readable facade with a bounded handhold sway", () => {
    const input = {
      topX: 4,
      topY: 20,
      topZ: -2,
      topHeight: 2,
      towerLevels: 8,
      motionSpeed: 1,
      baseRadius: 1.5,
    };

    const samples = [0, 1, 2, 3].map((elapsedSeconds) => sampleGorillaClimbPosition({ ...input, elapsedSeconds }));

    samples.forEach((sample) => {
      expect(sample.z).toBeCloseTo(input.topZ + input.baseRadius, 5);
      expect(Math.abs(sample.x - input.topX)).toBeLessThanOrEqual(input.baseRadius * 0.7);
    });
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
