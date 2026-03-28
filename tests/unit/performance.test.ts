import { describe, expect, it } from "vitest";
import {
  collectArchivableLevels,
  getQualityScalars,
  isSlabArchivable,
  resolveAdaptiveQualityPreset,
  selectDistractionLodTier,
  shouldUpdateForLod,
  toQualityPreset,
} from "../../src/game/logic/performance";

describe("quality preset helpers", () => {
  it("maps numeric debug values into low, medium, and high presets", () => {
    expect(toQualityPreset(-3)).toBe("low");
    expect(toQualityPreset(0)).toBe("low");
    expect(toQualityPreset(1)).toBe("medium");
    expect(toQualityPreset(2)).toBe("high");
    expect(toQualityPreset(9)).toBe("high");
  });

  it("returns stable scalar tables for each preset", () => {
    expect(getQualityScalars("low")).toMatchObject({
      keepRecentMultiplier: 0.65,
      distractionUpdateStride: 3,
      pixelRatioCap: 1,
    });
    expect(getQualityScalars("medium")).toMatchObject({
      keepRecentMultiplier: 0.82,
      distractionUpdateStride: 2,
      pixelRatioCap: 1.5,
    });
    expect(getQualityScalars("high")).toMatchObject({
      keepRecentMultiplier: 1,
      distractionUpdateStride: 1,
      pixelRatioCap: 2,
    });
  });
});

describe("performance archival rules", () => {
  it("marks every slab as archivable when keep-recent is disabled", () => {
    expect(isSlabArchivable(19, 20, 0)).toBe(true);
    expect(isSlabArchivable(20, 20, -4)).toBe(true);
  });

  it("marks slabs below keep-recent window as archivable", () => {
    expect(isSlabArchivable(4, 20, 10)).toBe(true);
    expect(isSlabArchivable(11, 20, 10)).toBe(false);
  });

  it("collects only levels eligible for archival", () => {
    expect(collectArchivableLevels([0, 5, 9, 11, 15], 15, 6)).toEqual([0, 5, 9]);
  });
});

describe("performance LOD selection", () => {
  it("selects high/medium/low based on near/far distance thresholds", () => {
    expect(selectDistractionLodTier(3, 6, 14)).toBe("high");
    expect(selectDistractionLodTier(10, 6, 14)).toBe("medium");
    expect(selectDistractionLodTier(20, 6, 14)).toBe("low");
  });

  it("clamps negative distances and swapped near/far thresholds safely", () => {
    expect(selectDistractionLodTier(-5, -2, -1)).toBe("high");
    expect(selectDistractionLodTier(5, 14, 6)).toBe("high");
    expect(selectDistractionLodTier(10, 14, 6)).toBe("low");
    expect(selectDistractionLodTier(20, 14, 6)).toBe("low");
  });

  it("throttles updates for medium and low LOD channels", () => {
    expect(shouldUpdateForLod("high", 1, 2)).toBe(true);
    expect(shouldUpdateForLod("medium", 1, 2)).toBe(false);
    expect(shouldUpdateForLod("medium", 2, 2)).toBe(true);
    expect(shouldUpdateForLod("low", 2, 2)).toBe(false);
    expect(shouldUpdateForLod("low", 4, 2)).toBe(true);
  });

  it("clamps non-positive and fractional stride hints", () => {
    expect(shouldUpdateForLod("medium", 3, 0)).toBe(true);
    expect(shouldUpdateForLod("medium", 2, 1.9)).toBe(true);
    expect(shouldUpdateForLod("low", 3, 1.9)).toBe(false);
    expect(shouldUpdateForLod("low", 4, 1.9)).toBe(true);
  });
});

describe("adaptive quality", () => {
  it("drops quality by two tiers when frame time is far over budget", () => {
    const downgraded = resolveAdaptiveQualityPreset("high", "high", true, 26, 16.7);
    expect(downgraded).toBe("low");
  });

  it("drops quality by one tier when frame time is moderately over budget", () => {
    const downgraded = resolveAdaptiveQualityPreset("high", "high", true, 20, 16.7);
    expect(downgraded).toBe("medium");
  });

  it("recovers quality gradually when performance is comfortably under budget", () => {
    const upgraded = resolveAdaptiveQualityPreset("low", "high", true, 10, 16.7);
    expect(upgraded).toBe("medium");
  });

  it("does not jump above the current preset unless the budget allows it", () => {
    const unchanged = resolveAdaptiveQualityPreset("medium", "high", true, 15.5, 16.7);
    expect(unchanged).toBe("medium");
  });

  it("does not auto-adjust when auto quality is disabled", () => {
    const preset = resolveAdaptiveQualityPreset("low", "high", false, 40, 16.7);
    expect(preset).toBe("high");
  });

  it("can settle downward to the requested tier even when performance is healthy", () => {
    const settled = resolveAdaptiveQualityPreset("high", "medium", true, 10, 16.7);
    expect(settled).toBe("medium");
  });
});
