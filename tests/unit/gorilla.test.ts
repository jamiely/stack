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

  it("ping-pongs vertically instead of snapping from the top back to the bottom", () => {
    const input = {
      topX: 0,
      topY: 48,
      topZ: 0,
      topHeight: 3,
      towerLevels: 16,
      motionSpeed: 1,
      baseRadius: 4.2,
    };

    const climbRate = Math.max(0.15, input.motionSpeed) * 0.22;
    const peak = sampleGorillaClimbPosition({ ...input, elapsedSeconds: 1 / climbRate });
    const justAfterTurn = sampleGorillaClimbPosition({ ...input, elapsedSeconds: 1.01 / climbRate });

    expect(justAfterTurn.y).toBeLessThan(peak.y);
    expect(justAfterTurn.y).toBeGreaterThan(peak.y - input.topHeight * 0.2);
  });

  it("keeps the rendered Yeti crown below the top eave decoration", () => {
    const input = {
      topX: 0,
      topY: 48,
      topZ: 0,
      topHeight: 3,
      towerLevels: 16,
      motionSpeed: 1,
      baseRadius: 4.2,
      actorHeight: 1.9188,
    };

    const climbRate = Math.max(0.15, input.motionSpeed) * 0.22;
    const topSample = sampleGorillaClimbPosition({ ...input, elapsedSeconds: 0.99 / climbRate });
    const eaveHeight = Math.max(0.44, Math.min(0.78, input.topHeight * 0.26));
    const eaveLowerY = input.topY + input.topHeight / 2 - eaveHeight * 0.92;

    expect(topSample.y + input.actorHeight).toBeLessThanOrEqual(eaveLowerY - 0.08 + 1e-6);
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
