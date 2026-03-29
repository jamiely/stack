import { describe, expect, it } from "vitest";
import {
  LEDGE_ANIMATION_DURATION_SECONDS,
  resolveLedgeDimensions,
  resolveLedgeFaceIndex,
  sampleLedgeAnimationScaleX,
} from "../../src/game/logic/ledges";

describe("resolveLedgeFaceIndex", () => {
  it("returns null when no visible faces exist", () => {
    expect(resolveLedgeFaceIndex(0, 0.4)).toBeNull();
  });

  it("clamps noise and resolves a deterministic face index", () => {
    expect(resolveLedgeFaceIndex(3, -5)).toBe(0);
    expect(resolveLedgeFaceIndex(3, 0.34)).toBe(1);
    expect(resolveLedgeFaceIndex(3, 999)).toBe(2);
  });
});

describe("resolveLedgeDimensions", () => {
  it("applies slab-height and face-span constraints", () => {
    const dimensions = resolveLedgeDimensions(1.2, 3, 0.5);

    expect(dimensions.widthRatio).toBeCloseTo(0.625, 6);
    expect(dimensions.ledgeWidth).toBeCloseTo(0.75, 6);
    expect(dimensions.ledgeHeight).toBeCloseTo(0.3, 6);
    expect(dimensions.ledgeDepth).toBeCloseTo(0.52, 6);
    expect(dimensions.lipHeight).toBeCloseTo(0.102, 6);
    expect(dimensions.lipDepth).toBeCloseTo(0.1144, 6);
  });

  it("enforces min/max bounds for tiny slabs and out-of-range noise", () => {
    const lowNoise = resolveLedgeDimensions(0.2, 0.4, -9);
    expect(lowNoise.widthRatio).toBeCloseTo(0.25, 6);
    expect(lowNoise.ledgeWidth).toBeCloseTo(0.24, 6);
    expect(lowNoise.ledgeHeight).toBeCloseTo(0.1, 6);
    expect(lowNoise.ledgeDepth).toBeCloseTo(0.24, 6);
    expect(lowNoise.lipDepth).toBeCloseTo(0.06, 6);

    const highNoise = resolveLedgeDimensions(0.4, 12, 9);
    expect(highNoise.widthRatio).toBeCloseTo(1, 6);
    expect(highNoise.ledgeDepth).toBeCloseTo(0.52, 6);
  });
});

describe("sampleLedgeAnimationScaleX", () => {
  it("uses eased progression and reports completion", () => {
    const start = sampleLedgeAnimationScaleX(0, LEDGE_ANIMATION_DURATION_SECONDS, 0.7);
    expect(start.scaleX).toBeCloseTo(0.01, 6);
    expect(start.completed).toBe(false);

    const mid = sampleLedgeAnimationScaleX(LEDGE_ANIMATION_DURATION_SECONDS / 2, LEDGE_ANIMATION_DURATION_SECONDS, 0.7);
    expect(mid.scaleX).toBeGreaterThan(0.01);
    expect(mid.scaleX).toBeLessThan(0.7);
    expect(mid.completed).toBe(false);

    const end = sampleLedgeAnimationScaleX(LEDGE_ANIMATION_DURATION_SECONDS, LEDGE_ANIMATION_DURATION_SECONDS, 0.7);
    expect(end.scaleX).toBeCloseTo(0.7, 6);
    expect(end.completed).toBe(true);
  });

  it("completes instantly for non-positive duration", () => {
    const instant = sampleLedgeAnimationScaleX(0.1, 0, 0.4);
    expect(instant.scaleX).toBeCloseTo(0.4, 6);
    expect(instant.completed).toBe(true);
  });
});
