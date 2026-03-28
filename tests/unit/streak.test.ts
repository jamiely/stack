import { describe, expect, it } from "vitest";
import { createComboState, updateComboState } from "../../src/game/logic/streak";

describe("combo streak logic", () => {
  it("creates a clamped combo state", () => {
    expect(createComboState(8)).toEqual({
      current: 0,
      best: 0,
      target: 8,
      rewardReady: false,
    });

    expect(createComboState(0).target).toBe(1);
  });

  it("increments on perfect placements and tracks best", () => {
    const first = updateComboState(createComboState(8), "perfect");
    const second = updateComboState(first, "perfect");

    expect(second.current).toBe(2);
    expect(second.best).toBe(2);
    expect(second.rewardReady).toBe(false);
  });

  it("marks reward ready once target is reached", () => {
    let state = createComboState(3);
    state = updateComboState(state, "perfect");
    state = updateComboState(state, "perfect");
    state = updateComboState(state, "perfect");

    expect(state.current).toBe(3);
    expect(state.rewardReady).toBe(true);
    expect(state.best).toBe(3);
  });

  it("resets current streak after landed or miss while preserving best", () => {
    let state = createComboState(4);
    state = updateComboState(state, "perfect");
    state = updateComboState(state, "perfect");

    const landedReset = updateComboState(state, "landed");
    const missReset = updateComboState({ ...state, current: 3, rewardReady: true }, "miss");

    expect(landedReset.current).toBe(0);
    expect(landedReset.best).toBe(2);
    expect(landedReset.rewardReady).toBe(false);

    expect(missReset.current).toBe(0);
    expect(missReset.best).toBe(2);
    expect(missReset.rewardReady).toBe(false);
  });
});
