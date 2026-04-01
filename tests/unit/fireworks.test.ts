import { describe, expect, it } from "vitest";
import {
  initializeFireworksState,
  sanitizeFireworksConfig,
  stepFireworksState,
  type FireworksConfig,
  type FireworksState,
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

function stepForDuration({
  seed = 42,
  seconds,
  isChannelActive,
  config = baseConfig,
}: {
  seed?: number;
  seconds: number;
  isChannelActive: boolean;
  config?: FireworksConfig;
}): FireworksState {
  let state = initializeFireworksState({ seed, config });
  const deltaSeconds = 1 / 60;
  const ticks = Math.ceil(seconds / deltaSeconds);

  for (let index = 0; index < ticks; index += 1) {
    state = stepFireworksState({
      previousState: state,
      config,
      deltaSeconds,
      isChannelActive,
    });
  }

  return state;
}

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

describe("fireworks scheduler and shell lifecycle", () => {
  it("keeps launch intervals in range without starvation over 20 seconds", () => {
    const state = stepForDuration({ seconds: 20, isChannelActive: true });
    const launchTimes = state.telemetry.launchEvents.map((event) => event.elapsedSeconds);
    expect(launchTimes.length).toBeGreaterThan(5);

    const intervals = launchTimes.slice(1).map((timestamp, index) => timestamp - launchTimes[index]);
    const maxTickDrift = 1 / 60;
    expect(intervals.every((interval) => interval >= baseConfig.launchIntervalMinSeconds)).toBe(true);
    expect(intervals.every((interval) => interval <= baseConfig.launchIntervalMaxSeconds + maxTickDrift)).toBe(true);
    expect(Math.max(...intervals)).toBeLessThanOrEqual(3);
  });

  it("produces zero launches when channel is gated off", () => {
    const state = stepForDuration({ seconds: 20, isChannelActive: false });
    expect(state.telemetry.launches).toBe(0);
    expect(state.telemetry.launchEvents).toHaveLength(0);
    expect(state.telemetry.primaryBurstEvents).toHaveLength(0);
  });

  it("emits exactly one primary burst per shell near apex after at least six ticks", () => {
    const state = stepForDuration({ seconds: 20, isChannelActive: true });
    const launchesByShell = new Map(state.telemetry.launchEvents.map((event) => [event.shellId, event]));

    expect(state.telemetry.primaryBurstEvents.length).toBeGreaterThan(0);

    for (const burst of state.telemetry.primaryBurstEvents) {
      const launch = launchesByShell.get(burst.shellId);
      expect(launch).toBeDefined();
      expect(burst.shellTicks).toBeGreaterThanOrEqual(6);
      expect(Math.abs(burst.tick - burst.apexTick)).toBeLessThanOrEqual(1);

      const shellArcSeconds = burst.elapsedSeconds - (launch?.elapsedSeconds ?? 0);
      expect(shellArcSeconds).toBeGreaterThanOrEqual(0.45);
      expect(shellArcSeconds).toBeLessThanOrEqual(1.1 + 1 / 60);
    }

    const burstCountByShell = new Map<string, number>();
    for (const burst of state.telemetry.primaryBurstEvents) {
      burstCountByShell.set(burst.shellId, (burstCountByShell.get(burst.shellId) ?? 0) + 1);
    }

    for (const [, count] of burstCountByShell) {
      expect(count).toBe(1);
    }

    const activeShellIds = new Set(state.shells.map((shell) => shell.id));
    for (const burst of state.telemetry.primaryBurstEvents) {
      expect(activeShellIds.has(burst.shellId)).toBe(false);
    }
  });
});

describe("fireworks simulation determinism", () => {
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
    const run = () => stepForDuration({ seed: 7, seconds: 20, isChannelActive: true }).snapshot;
    expect(run()).toEqual(run());
  });
});
