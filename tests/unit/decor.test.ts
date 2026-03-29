import { describe, expect, it } from "vitest";
import {
  FACE_ROTATION,
  filterFacesByVisibility,
  isFaceHiddenFromCamera,
  resolveEaveCornerSealSize,
  resolveEaveWidth,
  resolveSlabHue,
  resolveTentaclePalette,
  resolveTentacleSegmentOffset,
  resolveWindowCountNoise,
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
    expect(
      isFaceHiddenFromCamera(
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        FACE_ROTATION.posX,
      ),
    ).toBe(false);
    expect(
      isFaceHiddenFromCamera(
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        FACE_ROTATION.negX,
      ),
    ).toBe(true);

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

describe("tentacle styling and segment offsets", () => {
  it("alternates deterministic tentacle palettes including green and pink", () => {
    const palettes = Array.from({ length: 24 }, (_, level) => resolveTentaclePalette(level, 1.7));
    expect(palettes).toContain("green");
    expect(palettes).toContain("pink");
    expect(palettes).toContain("purple");
  });

  it("anchors the base segment at the window center", () => {
    expect(resolveTentacleSegmentOffset(0, 3, 0.2, 0.2)).toEqual({ x: 0, y: 0 });
  });

  it("keeps later segments within bounded lateral offsets", () => {
    const offset = resolveTentacleSegmentOffset(3, 2, 0.3, 0.25);
    expect(Math.abs(offset.x)).toBeLessThanOrEqual(0.3 * 0.22 + 1e-9);
    expect(Math.abs(offset.y)).toBeLessThanOrEqual(0.25 * 0.24 + 1e-9);
  });
});

describe("eave helpers", () => {
  it("keeps eave width flush with the slab span", () => {
    expect(resolveEaveWidth(1.2)).toBeCloseTo(1.2, 6);
    expect(resolveEaveWidth(2.4)).toBeCloseTo(2.4, 6);
  });

  it("respects a minimum renderable eave width", () => {
    expect(resolveEaveWidth(0.08)).toBeCloseTo(0.36, 6);
  });

  it("resolves bounded corner-seal size", () => {
    expect(resolveEaveCornerSealSize(0.44)).toBeCloseTo(0.00792, 6);
    expect(resolveEaveCornerSealSize(0.2)).toBeCloseTo(0.006, 6);
    expect(resolveEaveCornerSealSize(1.2)).toBeCloseTo(0.014, 6);
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

  it("resolves deterministic window-count noise per face", () => {
    const a = resolveWindowCountNoise(12, 1.7);
    const b = resolveWindowCountNoise(12, 1.7);
    const c = resolveWindowCountNoise(12, 2.9);

    expect(a).toBeCloseTo(b, 12);
    expect(a).not.toBe(c);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
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
