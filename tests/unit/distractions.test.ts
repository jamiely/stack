import { describe, expect, it } from "vitest";
import { createDistractionState, updateDistractionState } from "../../src/game/logic/distractions";

const config = {
  distractionsEnabled: true,
  distractionMotionSpeed: 1,
  distractionTentacleEnabled: true,
  distractionTentacleStartLevel: 3,
  distractionGorillaEnabled: true,
  distractionGorillaStartLevel: 8,
  distractionTremorEnabled: true,
  distractionUfoEnabled: true,
  distractionUfoStartLevel: 14,
  distractionContrastEnabled: true,
  distractionCloudEnabled: true,
  distractionCloudStartLevel: 20,
  distractionFireworksEnabled: true,
  distractionFireworksStartLevel: 16,
};

describe("distraction logic", () => {
  it("activates channels only after their configured level thresholds", () => {
    const initial = createDistractionState(42);

    const early = updateDistractionState(initial, 1 / 60, 2, config);
    expect(early.snapshot.active).toEqual({
      tentacle: false,
      gorilla: false,
      tremor: false,
      ufo: false,
      contrastWash: false,
      clouds: false,
      fireworks: false,
    });

    const mid = updateDistractionState(early, 1 / 60, 9, config);
    expect(mid.snapshot.active.tentacle).toBe(true);
    expect(mid.snapshot.active.gorilla).toBe(true);
    expect(mid.snapshot.active.tremor).toBe(true);
    expect(mid.snapshot.active.ufo).toBe(false);
    expect(mid.snapshot.active.contrastWash).toBe(false);
    expect(mid.snapshot.active.clouds).toBe(false);

    const high = updateDistractionState(mid, 1 / 60, 21, config);
    expect(high.snapshot.active).toEqual({
      tentacle: true,
      gorilla: true,
      tremor: true,
      ufo: true,
      contrastWash: true,
      clouds: true,
      fireworks: true,
    });
  });

  it("supports deterministic seeded motion and pulse signals", () => {
    const run = (seed: number) => {
      let state = createDistractionState(seed);
      for (let step = 0; step < 240; step += 1) {
        state = updateDistractionState(state, 1 / 60, 25, config);
      }
      return state.snapshot;
    };

    const first = run(7);
    const second = run(7);
    const other = run(8);

    expect(first).toEqual(second);
    expect(first.signals).not.toEqual(other.signals);
    expect(first.signals.tremor).toBeGreaterThanOrEqual(0);
    expect(first.signals.tremor).toBeLessThanOrEqual(1);
  });

  it("can be globally disabled or channel disabled by toggle", () => {
    const baseState = createDistractionState(100);

    const globallyOff = updateDistractionState(baseState, 1, 40, {
      ...config,
      distractionsEnabled: false,
    });

    expect(Object.values(globallyOff.snapshot.active).every((value) => !value)).toBe(true);
    expect(Object.values(globallyOff.snapshot.signals).every((value) => value === 0)).toBe(true);

    const ufoOff = updateDistractionState(baseState, 1, 40, {
      ...config,
      distractionUfoEnabled: false,
    });

    expect(ufoOff.snapshot.active.ufo).toBe(false);
    expect(ufoOff.snapshot.active.contrastWash).toBe(false);

    const fireworksOff = updateDistractionState(baseState, 1, 40, {
      ...config,
      distractionFireworksEnabled: false,
    });

    expect(fireworksOff.snapshot.active.fireworks).toBe(false);
  });
});
