import { describe, expect, it } from "vitest";
import {
  filterFacesByVisibility,
  isFaceHiddenFromCamera,
  resolveSlabHue,
  resolveWindowMetrics,
  resolveWindowShutterPalette,
  sampleDecorNoise,
  shouldRenderWeathering,
  shouldUseDarkWindowTrim,
} from "../../src/game/logic/decor";

describe("sampleDecorNoise", () => {
  it("is deterministic and normalized", () => {
    const a = sampleDecorNoise(12.34, 5.67);
    const b = sampleDecorNoise(12.34, 5.67);

    expect(a).toBeCloseTo(b, 12);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });
});

describe("resolveWindowMetrics", () => {
  it("resolves bounded metrics from slab height", () => {
    const low = resolveWindowMetrics(0.2);
    expect(low.windowHeight).toBeCloseTo(0.5, 6);
    expect(low.windowWidth).toBeCloseTo(0.21, 6);
    expect(low.frameDepth).toBeCloseTo(0.063, 6);
    expect(low.frameThickness).toBeCloseTo(0.042, 6);
    expect(low.sillHeight).toBeCloseTo(0.03, 6);
    expect(low.sillDepth).toBeCloseTo(0.1197, 6);

    const high = resolveWindowMetrics(8);
    expect(high.windowHeight).toBeCloseTo(0.92, 6);
    expect(high.windowWidth).toBeCloseTo(0.3864, 6);
    expect(high.frameDepth).toBeCloseTo(0.08, 6);
    expect(high.frameThickness).toBeCloseTo(0.07728, 6);
    expect(high.sillHeight).toBeCloseTo(0.046368, 6);
    expect(high.sillDepth).toBeCloseTo(0.152, 6);
  });
});

describe("isFaceHiddenFromCamera", () => {
  it("classifies face visibility from camera/normal orientation", () => {
    expect(
      isFaceHiddenFromCamera(
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        Math.PI / 2,
      ),
    ).toBe(false);

    expect(
      isFaceHiddenFromCamera(
        { x: 0, z: 0 },
        { x: -10, z: 0 },
        Math.PI / 2,
      ),
    ).toBe(true);
  });

  it("filters descriptors by visible or hidden faces", () => {
    const faces = [
      { id: "front", rotationY: 0 },
      { id: "back", rotationY: Math.PI },
      { id: "right", rotationY: Math.PI / 2 },
    ];

    const visible = filterFacesByVisibility(faces, { x: 0, z: 0 }, { x: 6, z: 6 }, "visible");
    const hidden = filterFacesByVisibility(faces, { x: 0, z: 0 }, { x: 6, z: 6 }, "hidden");

    expect(visible.some((face) => face.id === "front")).toBe(true);
    expect(visible.some((face) => face.id === "right")).toBe(true);
    expect(hidden.some((face) => face.id === "back")).toBe(true);
  });
});

describe("weathering and hue helpers", () => {
  it("applies weathering threshold", () => {
    expect(shouldRenderWeathering(0.16)).toBe(false);
    expect(shouldRenderWeathering(0.160001)).toBe(true);
    expect(shouldRenderWeathering(0.2, 0.3)).toBe(false);
  });

  it("computes slab hue progression", () => {
    expect(resolveSlabHue(0)).toBe(42);
    expect(resolveSlabHue(1)).toBe(73);
    expect(resolveSlabHue(12)).toBe((42 + 12 * 31) % 360);
  });

  it("deterministically varies trim darkness and shutter palettes", () => {
    expect(shouldUseDarkWindowTrim(8)).toBe(shouldUseDarkWindowTrim(8));
    const darkSamples = Array.from({ length: 24 }, (_, level) => shouldUseDarkWindowTrim(level));
    expect(darkSamples.some((value) => value)).toBe(true);
    expect(darkSamples.some((value) => !value)).toBe(true);

    const palette = resolveWindowShutterPalette(4);
    expect(["slate", "teal", "plum", "sand"]).toContain(palette);
    expect(resolveWindowShutterPalette(4)).toBe(palette);
  });
});
