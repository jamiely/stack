import { describe, expect, it } from "vitest";
import {
  applyPlacementRecoveryTick,
  createRecoveryState,
  getRecoverySpeedMultiplier,
  resolveRecoveryReward,
} from "../../src/game/logic/recovery";
import { createComboState, updateComboState } from "../../src/game/logic/streak";
import type { SlabData } from "../../src/game/types";

function createLandedSlab(overrides: Partial<SlabData> = {}): SlabData {
  return {
    level: 4,
    axis: "x",
    direction: 1,
    position: { x: 0, y: 4, z: 0 },
    dimensions: { width: 2.4, depth: 3.1, height: 1 },
    ...overrides,
  };
}

describe("recovery reward logic", () => {
  it("triggers once per combo milestone and grows slab dimensions up to base", () => {
    let combo = createComboState(4);
    combo = updateComboState(combo, "perfect");
    combo = updateComboState(combo, "perfect");
    combo = updateComboState(combo, "perfect");
    combo = updateComboState(combo, "perfect");

    const first = resolveRecoveryReward(createRecoveryState(), combo, createLandedSlab(), {
      baseWidth: 4,
      baseDepth: 4,
      growthMultiplier: 1.2,
      slowdownPlacements: 3,
    });

    expect(first.triggered).toBe(true);
    expect(first.state).toEqual({ rewardsEarned: 1, slowdownPlacementsRemaining: 3 });
    expect(first.landedSlab.dimensions.width).toBeCloseTo(2.88, 5);
    expect(first.landedSlab.dimensions.depth).toBeCloseTo(3.72, 5);

    const duplicateMilestone = resolveRecoveryReward(first.state, combo, first.landedSlab, {
      baseWidth: 4,
      baseDepth: 4,
      growthMultiplier: 1.2,
      slowdownPlacements: 3,
    });

    expect(duplicateMilestone.triggered).toBe(false);
    expect(duplicateMilestone.state.rewardsEarned).toBe(1);

    const capped = resolveRecoveryReward(createRecoveryState(), combo, createLandedSlab({
      dimensions: { width: 3.9, depth: 3.95, height: 1 },
    }), {
      baseWidth: 4,
      baseDepth: 4,
      growthMultiplier: 1.2,
      slowdownPlacements: 3,
    });

    expect(capped.landedSlab.dimensions.width).toBe(4);
    expect(capped.landedSlab.dimensions.depth).toBe(4);
  });

  it("applies slowdown multiplier only while charges remain and clamps bounds", () => {
    const idle = createRecoveryState();
    expect(getRecoverySpeedMultiplier(idle, 0.6)).toBe(1);

    const active = { rewardsEarned: 1, slowdownPlacementsRemaining: 2 };
    expect(getRecoverySpeedMultiplier(active, 0.6)).toBe(0.6);
    expect(getRecoverySpeedMultiplier(active, 0)).toBe(0.25);
    expect(getRecoverySpeedMultiplier(active, 2)).toBe(1);

    const afterOnePlacement = applyPlacementRecoveryTick(active);
    const afterTwoPlacements = applyPlacementRecoveryTick(afterOnePlacement);
    const afterExtraPlacement = applyPlacementRecoveryTick(afterTwoPlacements);

    expect(afterOnePlacement.slowdownPlacementsRemaining).toBe(1);
    expect(afterTwoPlacements.slowdownPlacementsRemaining).toBe(0);
    expect(afterExtraPlacement.slowdownPlacementsRemaining).toBe(0);
    expect(getRecoverySpeedMultiplier(afterTwoPlacements, 0.6)).toBe(1);
  });
});
