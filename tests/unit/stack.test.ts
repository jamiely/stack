import { describe, expect, it } from "vitest";
import { defaultDebugConfig } from "../../src/game/debugConfig";
import {
  createInitialStack,
  getAxisForLevel,
  getTravelSpeed,
  resolvePlacement,
  spawnActiveSlab,
} from "../../src/game/logic/stack";
import type { SlabData } from "../../src/game/types";

function makeSlab(overrides: Partial<SlabData> = {}): SlabData {
  const position = {
    x: 0,
    y: 1,
    z: 0,
    ...overrides.position,
  };
  const dimensions = {
    width: 4,
    depth: 4,
    height: 1,
    ...overrides.dimensions,
  };

  return {
    ...overrides,
    level: overrides.level ?? 1,
    axis: overrides.axis ?? "x",
    position,
    dimensions,
    direction: overrides.direction ?? 1,
  };
}

describe("stack logic", () => {
  it("alternates movement axis by level", () => {
    expect(getAxisForLevel(1)).toBe("x");
    expect(getAxisForLevel(2)).toBe("z");
    expect(getAxisForLevel(3)).toBe("x");
  });

  it("builds the initial stack from debug config", () => {
    const stack = createInitialStack({
      ...defaultDebugConfig,
      prebuiltLevels: 4,
      baseWidth: 5,
      baseDepth: 3,
      slabHeight: 0.75,
    });

    expect(stack).toHaveLength(4);
    expect(stack[3]).toEqual({
      level: 3,
      axis: "z",
      position: { x: 0, y: 2.25, z: 0 },
      dimensions: { width: 5, depth: 3, height: 0.75 },
      direction: 1,
    });
  });

  it("spawns the next active slab above the target on the correct axis", () => {
    const next = spawnActiveSlab(makeSlab(), defaultDebugConfig);

    expect(next.level).toBe(2);
    expect(next.axis).toBe("z");
    expect(next.position).toEqual({
      x: 0,
      y: 1 + defaultDebugConfig.slabHeight,
      z: -defaultDebugConfig.motionRange,
    });
    expect(next.dimensions).toEqual({ width: 4, depth: 4, height: defaultDebugConfig.slabHeight });
  });

  it("spawns x-axis movement from negative motion range on odd levels", () => {
    const next = spawnActiveSlab(
      makeSlab({
        level: 2,
        axis: "z",
        position: { x: 1.25, y: 2, z: -0.5 },
      }),
      defaultDebugConfig,
    );

    expect(next.axis).toBe("x");
    expect(next.position).toEqual({
      x: 1.25 - defaultDebugConfig.motionRange,
      y: 2 + defaultDebugConfig.slabHeight,
      z: -0.5,
    });
  });

  it("ramps travel speed by level", () => {
    expect(getTravelSpeed(1, defaultDebugConfig)).toBeCloseTo(defaultDebugConfig.motionSpeed);
    expect(getTravelSpeed(4, defaultDebugConfig)).toBeCloseTo(
      defaultDebugConfig.motionSpeed + defaultDebugConfig.speedRamp * 3,
    );
  });

  it("snaps near-perfect placements without shrinking the slab", () => {
    const target = makeSlab();
    const active = makeSlab({
      position: { x: 0.08, y: 2, z: 0 },
    });

    const result = resolvePlacement(active, target, 0.1);

    expect(result.outcome).toBe("perfect");
    expect(result.landedSlab?.position.x).toBe(0);
    expect(result.landedSlab?.dimensions.width).toBe(4);
    expect(result.debrisSlab).toBeNull();
  });

  it("trims the active slab and recenters the landed portion on x placements", () => {
    const target = makeSlab();
    const active = makeSlab({
      position: { x: 1, y: 2, z: 0 },
    });

    const result = resolvePlacement(active, target, 0.1);

    expect(result.outcome).toBe("landed");
    expect(result.overlap).toBe(3);
    expect(result.trimmedSize).toBe(1);
    expect(result.landedSlab?.position.x).toBe(0.5);
    expect(result.landedSlab?.dimensions.width).toBe(3);
    expect(result.debrisSlab?.position.x).toBe(2.5);
    expect(result.debrisSlab?.dimensions.width).toBe(1);
  });

  it("trims the active slab on z placements", () => {
    const target = makeSlab({
      level: 2,
      axis: "z",
      position: { x: 0, y: 2, z: 0 },
      dimensions: { width: 4, depth: 4, height: 1 },
    });
    const active = makeSlab({
      level: 3,
      axis: "z",
      position: { x: 0, y: 3, z: -1.5 },
      dimensions: { width: 4, depth: 4, height: 1 },
    });

    const result = resolvePlacement(active, target, 0.1);

    expect(result.outcome).toBe("landed");
    expect(result.landedSlab?.position.z).toBe(-0.75);
    expect(result.landedSlab?.dimensions.depth).toBe(2.5);
    expect(result.debrisSlab?.position.z).toBe(-2.75);
    expect(result.debrisSlab?.dimensions.depth).toBe(1.5);
  });

  it("snaps near-perfect z placements to the target depth", () => {
    const target = makeSlab({
      level: 2,
      axis: "z",
      position: { x: 0.5, y: 2, z: 1.2 },
      dimensions: { width: 4, depth: 2.5, height: 1 },
    });
    const active = makeSlab({
      level: 3,
      axis: "z",
      position: { x: 0.5, y: 3, z: 1.26 },
      dimensions: { width: 4, depth: 3.5, height: 1 },
    });

    const result = resolvePlacement(active, target, 0.1);

    expect(result.outcome).toBe("perfect");
    expect(result.landedSlab?.position.z).toBe(1.2);
    expect(result.landedSlab?.dimensions.depth).toBe(2.5);
  });

  it("sends centered trims to the positive debris side by default", () => {
    const target = makeSlab({
      dimensions: { width: 3.5, depth: 4, height: 1 },
    });
    const active = makeSlab({
      position: { x: 0, y: 2, z: 0 },
      dimensions: { width: 4, depth: 4, height: 1 },
    });

    const result = resolvePlacement(active, target, -1);

    expect(result.outcome).toBe("landed");
    expect(result.debrisSlab?.position.x).toBeGreaterThan(0);
  });

  it("treats no overlap as a miss", () => {
    const target = makeSlab();
    const active = makeSlab({
      position: { x: 4.5, y: 2, z: 0 },
    });

    const result = resolvePlacement(active, target, 0.1);

    expect(result.outcome).toBe("miss");
    expect(result.landedSlab).toBeNull();
    expect(result.debrisSlab).toBeNull();
  });

  it("treats an exact edge case against a smaller target as a miss", () => {
    const target = makeSlab({
      dimensions: { width: 2, depth: 4, height: 1 },
    });
    const active = makeSlab({
      position: { x: 2, y: 2, z: 0 },
    });

    const result = resolvePlacement(active, target, 0);

    expect(result.outcome).toBe("miss");
    expect(result.overlap).toBe(0);
  });
});
