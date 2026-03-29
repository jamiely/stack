import { describe, expect, it } from "vitest";
import {
  WINDOW_STYLES,
  getWindowHorizontalOffsets,
  resolveWindowCountForFace,
  resolveWindowStyle,
  shouldRenderWindowsForFace,
} from "../../src/game/logic/windows";

describe("resolveWindowStyle", () => {
  it("maps style noise deterministically", () => {
    expect(resolveWindowStyle(-1)).toBe("rectangular");
    expect(resolveWindowStyle(0.9999999)).toBe("bay");
    expect(WINDOW_STYLES.includes("bay")).toBe(true);
  });

  it("respects custom style lists", () => {
    expect(resolveWindowStyle(0.1, ["rectangular", "bay"])).toBe("rectangular");
    expect(resolveWindowStyle(0.75, ["rectangular", "bay"])).toBe("bay");
  });

  it("falls back safely when custom style list is empty", () => {
    expect(resolveWindowStyle(0.5, [])).toBe("rectangular");
  });
});

describe("window footprint decisions", () => {
  it("applies stricter style-specific minimum spans", () => {
    expect(shouldRenderWindowsForFace(0.9, "rectangular", 0.2, 0.05)).toBe(true);
    expect(shouldRenderWindowsForFace(0.9, "shuttered", 0.2, 0.05)).toBe(false);
    expect(shouldRenderWindowsForFace(1.1, "bay", 0.2, 0.05)).toBe(false);
    expect(shouldRenderWindowsForFace(1.25, "bay", 0.2, 0.05)).toBe(true);
  });

  it("resolves count by span, footprint and noise", () => {
    const faceSpan = 3.8;
    const windowWidth = 0.2;
    const frameThickness = 0.05;

    expect(resolveWindowCountForFace(faceSpan, "rectangular", windowWidth, frameThickness, -2)).toBe(1);
    expect(resolveWindowCountForFace(faceSpan, "rectangular", windowWidth, frameThickness, 0.9)).toBeGreaterThanOrEqual(1);
    expect(resolveWindowCountForFace(0.4, "rectangular", windowWidth, frameThickness, 0.5)).toBe(0);
  });
});

describe("getWindowHorizontalOffsets", () => {
  it("returns centered offset for single window", () => {
    expect(getWindowHorizontalOffsets(3, 1, "rectangular", 0.2, 0.05)).toEqual([0]);
  });

  it("keeps windows centered and symmetric", () => {
    const offsets = getWindowHorizontalOffsets(4, 3, "rectangular", 0.2, 0.05);
    expect(offsets).toHaveLength(3);
    expect(offsets[0]).toBeCloseTo(-offsets[2], 6);
    expect(offsets[1]).toBeCloseTo(0, 6);
  });

  it("prevents excessive spacing by clamping pair gaps while staying centered", () => {
    const offsets = getWindowHorizontalOffsets(12, 3, "rectangular", 0.2, 0.05);
    const leftGap = Math.abs(offsets[1] - offsets[0]);
    const rightGap = Math.abs(offsets[2] - offsets[1]);

    expect(leftGap).toBeCloseTo(rightGap, 6);
    expect(leftGap).toBeLessThan(0.7);
    expect(offsets[0]).toBeCloseTo(-offsets[2], 6);
  });

  it("keeps edge clearance for wide spans", () => {
    const span = 6;
    const offsets = getWindowHorizontalOffsets(span, 3, "bay", 0.2, 0.05);
    const maxOffset = Math.max(...offsets.map((value) => Math.abs(value)));

    expect(maxOffset).toBeLessThan(span / 2 - 0.25);
  });
});
