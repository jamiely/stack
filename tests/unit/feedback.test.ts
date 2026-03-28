import { describe, expect, it } from "vitest";
import { clampToneGain, getPlacementFeedbackPlan } from "../../src/game/logic/feedback";

describe("feedback logic", () => {
  it("maps each placement outcome to deterministic feedback plans", () => {
    const perfect = getPlacementFeedbackPlan("perfect");
    const landed = getPlacementFeedbackPlan("landed");
    const miss = getPlacementFeedbackPlan("miss");

    expect(perfect?.event).toBe("placement_perfect");
    expect(perfect?.audio).toHaveLength(2);
    expect(perfect?.hapticPattern).toBe(12);

    expect(landed?.event).toBe("placement_landed");
    expect(landed?.audio).toHaveLength(1);
    expect(landed?.hapticPattern).toBe(8);

    expect(miss?.event).toBe("placement_miss");
    expect(miss?.audio).toHaveLength(2);
    expect(miss?.hapticPattern).toEqual([16, 28, 24]);
  });

  it("clamps tone gain into a safe range", () => {
    expect(clampToneGain(-1)).toBe(0);
    expect(clampToneGain(0.12)).toBeCloseTo(0.12, 6);
    expect(clampToneGain(9)).toBe(0.3);
    expect(clampToneGain(Number.NaN)).toBe(0);
  });
});
