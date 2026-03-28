import { describe, expect, it } from "vitest";
import {
  collectArchivableLevels,
  isSlabArchivable,
  resolveAdaptiveQualityPreset,
  selectDistractionLodTier,
  shouldUpdateForLod,
} from "../../src/game/logic/performance";

describe("performance archival rules", () => {
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

  it("throttles updates for medium and low LOD channels", () => {
    expect(shouldUpdateForLod("high", 1, 2)).toBe(true);
    expect(shouldUpdateForLod("medium", 1, 2)).toBe(false);
    expect(shouldUpdateForLod("medium", 2, 2)).toBe(true);
    expect(shouldUpdateForLod("low", 2, 2)).toBe(false);
    expect(shouldUpdateForLod("low", 4, 2)).toBe(true);
  });
});

describe("adaptive quality", () => {
  it("drops quality when frame time breaches budget", () => {
    const downgraded = resolveAdaptiveQualityPreset("high", "high", true, 26, 16.7);
    expect(downgraded).toBe("low");
  });

  it("does not auto-adjust when auto quality is disabled", () => {
    const preset = resolveAdaptiveQualityPreset("low", "high", false, 40, 16.7);
    expect(preset).toBe("high");
  });
});
