import { describe, expect, it } from "vitest";
import { defaultDebugConfig } from "../../src/game/debugConfig";
import {
  FIXED_STEP_DEFAULT_SECONDS,
  canForceDistractionChannel,
  createDistractionTimerRecord,
  getUfoOrbitDurationSeconds,
  readTestModeOptions,
  tickDistractionTimerRecord,
} from "../../src/game/logic/runtime";

describe("readTestModeOptions", () => {
  it("returns disabled defaults when test mode is absent", () => {
    expect(readTestModeOptions("")).toEqual({
      enabled: false,
      startPaused: false,
      fixedStepSeconds: FIXED_STEP_DEFAULT_SECONDS,
      seed: null,
    });
  });

  it("parses enabled mode with optional step and seed", () => {
    expect(readTestModeOptions("?test=1&paused=0&step=0.1&seed=42.8")).toEqual({
      enabled: true,
      startPaused: false,
      fixedStepSeconds: 0.1,
      seed: 42,
    });

    expect(readTestModeOptions("?testMode=1&step=9&seed=nope")).toEqual({
      enabled: true,
      startPaused: true,
      fixedStepSeconds: FIXED_STEP_DEFAULT_SECONDS,
      seed: null,
    });
  });
});

describe("distraction timer helpers", () => {
  it("creates and ticks channel timers", () => {
    const record = createDistractionTimerRecord(2);
    expect(record.tentacle).toBe(2);
    expect(record.clouds).toBe(2);
    expect(record.bat).toBe(2);
    expect(record.fireworks).toBe(2);

    tickDistractionTimerRecord(record, ["tentacle", "ufo", "fireworks"], 0.5);
    expect(record.tentacle).toBe(1.5);
    expect(record.ufo).toBe(1.5);
    expect(record.fireworks).toBe(1.5);
    expect(record.gorilla).toBe(2);

    tickDistractionTimerRecord(record, ["tentacle", "ufo", "fireworks"], 8);
    expect(record.tentacle).toBe(0);
    expect(record.ufo).toBe(0);
    expect(record.fireworks).toBe(0);

    tickDistractionTimerRecord(record, ["tentacle", "ufo"], 1);
    expect(record.tentacle).toBe(0);
    expect(record.ufo).toBe(0);

    tickDistractionTimerRecord(record, ["tentacle"], -1);
    expect(record.tentacle).toBe(0);
  });
});

describe("distraction forcing + ufo orbit helpers", () => {
  it("checks channel forcing using debug config gates", () => {
    const config = { ...defaultDebugConfig };
    expect(canForceDistractionChannel("tentacle", config)).toBe(true);
    expect(canForceDistractionChannel("gorilla", config)).toBe(true);
    expect(canForceDistractionChannel("tremor", config)).toBe(true);
    expect(canForceDistractionChannel("ufo", config)).toBe(true);
    expect(canForceDistractionChannel("bat", config)).toBe(true);
    expect(canForceDistractionChannel("contrastWash", config)).toBe(true);
    expect(canForceDistractionChannel("clouds", config)).toBe(true);
    expect(canForceDistractionChannel("fireworks", config)).toBe(true);

    expect(canForceDistractionChannel("gorilla", { ...config, distractionsEnabled: false })).toBe(false);
    expect(canForceDistractionChannel("ufo", { ...config, distractionUfoEnabled: false })).toBe(false);
    expect(canForceDistractionChannel("tentacle", { ...config, distractionTentacleEnabled: false })).toBe(false);
    expect(canForceDistractionChannel("gorilla", { ...config, distractionGorillaEnabled: false })).toBe(false);
    expect(canForceDistractionChannel("tremor", { ...config, distractionTremorEnabled: false })).toBe(false);
    expect(canForceDistractionChannel("bat", { ...config, distractionBatEnabled: false })).toBe(false);
    expect(canForceDistractionChannel("contrastWash", { ...config, distractionContrastEnabled: false })).toBe(false);
    expect(canForceDistractionChannel("clouds", { ...config, distractionCloudEnabled: false })).toBe(false);
    expect(canForceDistractionChannel("fireworks", { ...config, distractionFireworksEnabled: false })).toBe(false);
  });

  it("computes orbit duration with speed floor", () => {
    const fast = getUfoOrbitDurationSeconds(2);
    const slow = getUfoOrbitDurationSeconds(0);
    expect(fast).toBeLessThan(slow);
    expect(slow).toBeCloseTo((Math.PI * 2) / (0.95 * 0.2), 10);
  });
});
