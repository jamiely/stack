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
    expect(resolveWindowStyle(0.39)).toBe(WINDOW_STYLES[1]);
    expect(resolveWindowStyle(0.9999999)).toBe("shuttered");
  });

  it("falls back safely when custom style list is empty", () => {
    expect(resolveWindowStyle(0.5, [])).toBe("rectangular");
  });
});

describe("window footprint decisions", () => {
  it("applies stricter shutter minimum span", () => {
    expect(shouldRenderWindowsForFace(0.9, "rectangular", 0.2, 0.05)).toBe(true);
    expect(shouldRenderWindowsForFace(0.9, "shuttered", 0.2, 0.05)).toBe(false);
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

  it("returns evenly spaced offsets for multiple windows", () => {
    const offsets = getWindowHorizontalOffsets(4, 3, "rectangular", 0.2, 0.05);
    expect(offsets).toHaveLength(3);
    expect(offsets[0]).toBeCloseTo(-offsets[2], 6);
    expect(offsets[1]).toBeCloseTo(0, 6);
  });
});
