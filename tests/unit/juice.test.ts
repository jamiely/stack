import { describe, expect, it } from "vitest";
import {
  SLAM_SECONDS,
  SLOWMO_SECONDS,
  TALLY_DELAY_SECONDS,
  WINDOW_GLOW_SECONDS,
  WINDOW_WAVE_STEP_SECONDS,
  comboLabel,
  comboSemitones,
  comboTier,
  hitStopSeconds,
  isNearMiss,
  milestoneReached,
  sampleSlam,
  slowMoScale,
  tallyDuration,
  tallyValue,
  windowGlow,
} from "../../src/game/logic/juice";

describe("drop feel", () => {
  it("squashes on impact, overshoots tall, and settles to rest", () => {
    expect(sampleSlam(0).scaleY).toBeLessThan(0.75);
    expect(sampleSlam(0).scaleXZ).toBeGreaterThan(1.1);
    const samples = Array.from({ length: 20 }, (_, i) => sampleSlam((SLAM_SECONDS * i) / 20).scaleY);
    expect(Math.max(...samples)).toBeGreaterThan(1.02);
    expect(sampleSlam(SLAM_SECONDS)).toEqual({ scaleY: 1, scaleXZ: 1 });
    expect(sampleSlam(-1).scaleY).toBe(sampleSlam(0).scaleY);
    expect(1 - sampleSlam(0, 2).scaleY).toBeCloseTo((1 - sampleSlam(0).scaleY) * 2);
  });

  it("freezes longer for perfects and long streaks, capped", () => {
    expect(hitStopSeconds("landed", 9)).toBe(0.04);
    expect(hitStopSeconds("perfect", 1)).toBeGreaterThan(0.06);
    expect(hitStopSeconds("perfect", 5)).toBeGreaterThan(hitStopSeconds("perfect", 1));
    expect(hitStopSeconds("perfect", 100)).toBe(0.12);
  });

  it("escalates the streak through x2, x5 and x10 tiers and climbs the thunk's pitch", () => {
    expect([0, 1, 2, 4, 5, 9, 10, 30].map(comboTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(comboLabel(1)).toBe("");
    expect(comboLabel(7)).toBe("x7");
    expect([1, 2, 3, 4, 5, 6].map(comboSemitones)).toEqual([0, 2, 4, 7, 9, 12]);
    expect(comboSemitones(0)).toBe(0);
    expect(comboSemitones(200)).toBe(19);
  });

  it("flags a barely-surviving slab as a near miss", () => {
    expect(isNearMiss(1, 4)).toBe(true);
    expect(isNearMiss(2, 4)).toBe(false);
    expect(isNearMiss(1, 0)).toBe(false);
  });
});

describe("milestones, collapse and tally", () => {
  it("celebrates each tenth floor once", () => {
    expect(milestoneReached(9, 10)).toBe(10);
    expect(milestoneReached(10, 11)).toBeNull();
    expect(milestoneReached(19, 21)).toBe(20);
    expect(milestoneReached(0, 0)).toBeNull();
  });

  it("starts the collapse in slow motion and eases back to full speed", () => {
    expect(slowMoScale(0)).toBe(0.25);
    expect(slowMoScale(SLOWMO_SECONDS / 2)).toBeGreaterThan(0.25);
    expect(slowMoScale(SLOWMO_SECONDS / 2)).toBeLessThan(1);
    expect(slowMoScale(SLOWMO_SECONDS)).toBe(1);
  });

  it("counts the score up after the collapse starts and lands exactly on it", () => {
    expect(tallyValue(30, 0)).toBe(0);
    expect(tallyValue(30, TALLY_DELAY_SECONDS)).toBe(0);
    const mid = tallyValue(30, TALLY_DELAY_SECONDS + tallyDuration(30) / 2);
    expect(mid).toBeGreaterThan(15);
    expect(mid).toBeLessThan(30);
    expect(tallyValue(30, TALLY_DELAY_SECONDS + tallyDuration(30))).toBe(30);
    expect(tallyDuration(1)).toBeLessThan(tallyDuration(30));
    expect(tallyDuration(1000)).toBe(2.2);
  });

  it("lights windows in a wave from the top floor down", () => {
    expect(windowGlow(0, 0)).toBe(0);
    expect(windowGlow(WINDOW_GLOW_SECONDS / 2, 0)).toBeCloseTo(1);
    expect(windowGlow(WINDOW_GLOW_SECONDS / 2, 3)).toBeLessThan(windowGlow(WINDOW_GLOW_SECONDS / 2, 0));
    expect(windowGlow(3 * WINDOW_WAVE_STEP_SECONDS + WINDOW_GLOW_SECONDS / 2, 3)).toBeCloseTo(1);
    expect(windowGlow(WINDOW_GLOW_SECONDS, 0)).toBe(0);
  });
});
