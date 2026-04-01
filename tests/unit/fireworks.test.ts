import { describe, expect, it } from "vitest";
import {
  initializeFireworksState,
  sanitizeFireworksConfig,
  stepFireworksState,
  type FireworksConfig,
} from "../../src/game/logic/fireworks";

const baseConfig: FireworksConfig = {
  launchIntervalMinSeconds: 0.8,
  launchIntervalMaxSeconds: 2.4,
  shellSpeedMin: 14,
  shellSpeedMax: 24,
  shellGravity: 18,
  shellTrailTicksMin: 6,
  shellTrailTicksMax: 20,
  secondaryDelayMinSeconds: 0.05,
  secondaryDelayMaxSeconds: 0.35,
  particleLifetimeMinSeconds: 0.4,
  particleLifetimeMaxSeconds: 2.4,
  maxActiveParticles: 240,
  spawnXMin: -18,
  spawnXMax: 18,
  spawnZMin: -32,
  spawnZMax: -14,
};

describe("fireworks config sanitization", () => {
  it("clamps and normalizes adversarial values", () => {
    const sanitized = sanitizeFireworksConfig({
      launchIntervalMinSeconds: -1,
      launchIntervalMaxSeconds: 0.1,
      shellSpeedMin: 30,
      shellSpeedMax: 2,
      shellGravity: Number.NaN,
      shellTrailTicksMin: -4,
      shellTrailTicksMax: 0,
      secondaryDelayMinSeconds: 5,
      secondaryDelayMaxSeconds: -1,
      particleLifetimeMinSeconds: 0,
      particleLifetimeMaxSeconds: -2,
      maxActiveParticles: 1,
      spawnXMin: 10,
      spawnXMax: -10,
      spawnZMin: 7,
      spawnZMax: -3,
    });

    expect(sanitized.launchIntervalMinSeconds).toBeGreaterThanOrEqual(0.2);
    expect(sanitized.launchIntervalMaxSeconds).toBeGreaterThanOrEqual(sanitized.launchIntervalMinSeconds);
    expect(sanitized.shellSpeedMax).toBeGreaterThanOrEqual(sanitized.shellSpeedMin);
    expect(sanitized.shellGravity).toBeGreaterThanOrEqual(0);
    expect(sanitized.shellTrailTicksMin).toBeGreaterThanOrEqual(1);
    expect(sanitized.shellTrailTicksMax).toBeGreaterThanOrEqual(sanitized.shellTrailTicksMin);
    expect(sanitized.secondaryDelayMaxSeconds).toBeGreaterThanOrEqual(sanitized.secondaryDelayMinSeconds);
    expect(sanitized.particleLifetimeMaxSeconds).toBeGreaterThanOrEqual(sanitized.particleLifetimeMinSeconds);
    expect(sanitized.maxActiveParticles).toBeGreaterThanOrEqual(32);
    expect(sanitized.spawnXMax).toBeGreaterThanOrEqual(sanitized.spawnXMin);
    expect(sanitized.spawnZMax).toBeGreaterThanOrEqual(sanitized.spawnZMin);
  });
});

describe("fireworks simulation skeleton", () => {
  it("initializes deterministically for same seed and config", () => {
    const first = initializeFireworksState({ seed: 42, config: baseConfig });
    const second = initializeFireworksState({ seed: 42, config: baseConfig });

    expect(first).toEqual(second);
  });

  it("steps deterministically from the same snapshot", () => {
    const initial = initializeFireworksState({ seed: 99, config: baseConfig });

    const firstStep = stepFireworksState({
      previousState: initial,
      config: baseConfig,
      deltaSeconds: 1 / 60,
      isChannelActive: true,
    });
    const secondStep = stepFireworksState({
      previousState: initial,
      config: baseConfig,
      deltaSeconds: 1 / 60,
      isChannelActive: true,
    });

    expect(firstStep).toEqual(secondStep);
  });

  it("replays fixed-step sequences identically", () => {
    const run = () => {
      let state = initializeFireworksState({ seed: 7, config: baseConfig });
      for (let index = 0; index < 180; index += 1) {
        state = stepFireworksState({
          previousState: state,
          config: baseConfig,
          deltaSeconds: 1 / 60,
          isChannelActive: true,
        });
      }
      return state.snapshot;
    };

    expect(run()).toEqual(run());
  });
});
