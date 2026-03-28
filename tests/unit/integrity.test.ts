import { describe, expect, it } from "vitest";
import {
  classifyIntegrity,
  computeCenterOfMass,
  resolveIntegrityTelemetry,
} from "../../src/game/logic/integrity";
import type { SlabData } from "../../src/game/types";

function makeSlab(overrides: Partial<SlabData> = {}): SlabData {
  const position = {
    x: 0,
    y: overrides.level ?? 0,
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
    level: overrides.level ?? 0,
    axis: overrides.axis ?? "x",
    direction: overrides.direction ?? 1,
    position,
    dimensions,
  };
}

describe("integrity logic", () => {
  it("computes weighted center of mass across slab footprints", () => {
    const center = computeCenterOfMass([
      makeSlab({ position: { x: 0, y: 0, z: 0 }, dimensions: { width: 4, depth: 4, height: 1 } }),
      makeSlab({ position: { x: 2, y: 1, z: 0 }, dimensions: { width: 2, depth: 2, height: 1 }, level: 1 }),
    ]);

    expect(center.totalMass).toBe(20);
    expect(center.x).toBeCloseTo(0.4);
    expect(center.z).toBeCloseTo(0);
  });

  it("classifies stable/precarious/unstable tiers by normalized offset", () => {
    const thresholds = { precarious: 0.55, unstable: 0.9 };

    expect(classifyIntegrity(0.2, thresholds)).toBe("stable");
    expect(classifyIntegrity(0.7, thresholds)).toBe("precarious");
    expect(classifyIntegrity(1.1, thresholds)).toBe("unstable");
  });

  it("returns stable telemetry with zero wobble when no slabs are present", () => {
    const telemetry = resolveIntegrityTelemetry([], { precarious: 0.55, unstable: 0.9 }, 0.25);

    expect(telemetry.tier).toBe("stable");
    expect(telemetry.normalizedOffset).toBe(0);
    expect(telemetry.wobbleStrength).toBe(0);
  });

  it("ramps wobble within precarious band and saturates at unstable", () => {
    const precariousTelemetry = resolveIntegrityTelemetry(
      [
        makeSlab({ level: 0, position: { x: 0, y: 0, z: 0 }, dimensions: { width: 4, depth: 4, height: 1 } }),
        makeSlab({ level: 1, position: { x: 1.2, y: 1, z: 0 }, dimensions: { width: 4, depth: 4, height: 1 } }),
      ],
      { precarious: 0.2, unstable: 0.6 },
      0.3,
    );

    expect(precariousTelemetry.tier).toBe("precarious");
    expect(precariousTelemetry.wobbleStrength).toBeGreaterThan(0);
    expect(precariousTelemetry.wobbleStrength).toBeLessThan(0.3);

    const unstableTelemetry = resolveIntegrityTelemetry(
      [
        makeSlab({ level: 0, position: { x: 0, y: 0, z: 0 }, dimensions: { width: 4, depth: 4, height: 1 } }),
        makeSlab({ level: 1, position: { x: 2.8, y: 1, z: 0 }, dimensions: { width: 4, depth: 4, height: 1 } }),
      ],
      { precarious: 0.2, unstable: 0.6 },
      0.3,
    );

    expect(unstableTelemetry.tier).toBe("unstable");
    expect(unstableTelemetry.wobbleStrength).toBe(0.3);
  });
});
