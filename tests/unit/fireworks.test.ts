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

  it("spawns shells around the per-step launch origin in world space", () => {
    const config = {
      ...baseConfig,
      launchIntervalMinSeconds: 0.2,
      launchIntervalMaxSeconds: 0.2,
      spawnXMin: 0,
      spawnXMax: 0,
      spawnZMin: 0,
      spawnZMax: 0,
    } satisfies FireworksConfig;

    let state = initializeFireworksState({ seed: 42, config });

    state = stepFireworksState({
      previousState: state,
      config,
      deltaSeconds: 0.2,
      isChannelActive: true,
      launchOriginX: -3.25,
      launchOriginY: 27.5,
      launchOriginZ: 11.75,
    });

    expect(state.telemetry.launches).toBeGreaterThan(0);
    expect(state.shells[0]?.x ?? 0).toBeCloseTo(-3.25, 6);
    expect(state.shells[0]?.y ?? 0).toBeCloseTo(27.5, 6);
    expect(state.shells[0]?.z ?? 0).toBeCloseTo(11.75, 6);
  });

  it("alternates shell lateral spawn halves so repeated launches cover both sides of origin", () => {
    const config = {
      ...baseConfig,
      launchIntervalMinSeconds: 0.2,
      launchIntervalMaxSeconds: 0.2,
      spawnXMin: -8,
      spawnXMax: 8,
      spawnZMin: 0,
      spawnZMax: 0,
    } satisfies FireworksConfig;

    let state = initializeFireworksState({ seed: 42, config });
    const originX = 5;

    for (let index = 0; index < 6; index += 1) {
      state = stepFireworksState({
        previousState: state,
        config,
        deltaSeconds: 0.2,
        isChannelActive: true,
        launchOriginX: originX,
        launchOriginY: 12,
        launchOriginZ: -4,
      });
    }

    expect(state.telemetry.launches).toBeGreaterThanOrEqual(3);
    const offsets = state.shells.map((shell) => shell.x - originX);
    expect(offsets.some((offset) => offset < 0)).toBe(true);
    expect(offsets.some((offset) => offset > 0)).toBe(true);
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

  it("enforces at least six pre-burst ticks even with low speed and high gravity config", () => {
    const state = stepForDuration({
      seconds: 20,
      isChannelActive: true,
      config: {
        ...baseConfig,
        shellGravity: 200,
        shellSpeedMin: 1,
        shellSpeedMax: 1,
        shellTrailTicksMin: 1,
        shellTrailTicksMax: 1,
      },
    });

    expect(state.telemetry.primaryBurstEvents.length).toBeGreaterThan(0);
    for (const burst of state.telemetry.primaryBurstEvents) {
      expect(burst.shellTicks).toBeGreaterThanOrEqual(6);
    }
  });

  it("keeps six-tick shell minimum under coarse deterministic stepping", () => {
    const config: FireworksConfig = {
      ...baseConfig,
      shellGravity: 200,
      shellSpeedMin: 1,
      shellSpeedMax: 1,
      shellTrailTicksMin: 1,
      shellTrailTicksMax: 1,
    };
    let state = initializeFireworksState({ seed: 42, config });

    for (let step = 0; step < 120; step += 1) {
      state = stepFireworksState({
        previousState: state,
        config,
        deltaSeconds: 0.2,
        isChannelActive: true,
      });
    }

    expect(state.telemetry.primaryBurstEvents.length).toBeGreaterThan(0);
    for (const burst of state.telemetry.primaryBurstEvents) {
      expect(burst.shellTicks).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("fireworks secondary lifecycle and cleanup", () => {
  it("emits delayed secondary bursts and secondary particles trend downward by mid-life", () => {
    let state = initializeFireworksState({ seed: 42, config: baseConfig });
    const deltaSeconds = 1 / 60;

    for (let step = 0; step < 600 && state.telemetry.secondaryBurstEvents.length === 0; step += 1) {
      state = stepFireworksState({
        previousState: state,
        config: baseConfig,
        deltaSeconds,
        isChannelActive: true,
      });
    }

    expect(state.telemetry.secondaryBurstEvents.length).toBeGreaterThan(0);
    const firstSecondary = state.telemetry.secondaryBurstEvents[0];
    const primary = state.telemetry.primaryBurstEvents.find((event) => event.shellId === firstSecondary.shellId);
    expect(primary).toBeDefined();

    const secondaryDelay = firstSecondary.elapsedSeconds - (primary?.elapsedSeconds ?? 0);
    expect(secondaryDelay).toBeGreaterThanOrEqual(0.05);
    expect(secondaryDelay).toBeLessThanOrEqual(0.35 + deltaSeconds);

    const trackedParticle = state.particles.find(
      (particle) => particle.shellId === firstSecondary.shellId && particle.stage === "secondary",
    );
    expect(trackedParticle).toBeDefined();

    const trackedId = trackedParticle?.id ?? "";
    const initialVy = trackedParticle?.initialVy ?? 0;
    const halfLife = (trackedParticle?.lifetimeSeconds ?? 0) / 2;

    while (true) {
      const active = state.particles.find((particle) => particle.id === trackedId);
      expect(active).toBeDefined();
      if ((active?.ageSeconds ?? 0) >= halfLife) {
        expect((active?.vy ?? 0)).toBeLessThan(initialVy);
        expect((active?.vy ?? 0)).toBeLessThan(0);
        break;
      }

      state = stepFireworksState({
        previousState: state,
        config: baseConfig,
        deltaSeconds,
        isChannelActive: true,
      });
    }
  });

  it("keeps secondary delay telemetry inside 0.05s-0.35s under coarse deterministic stepping", () => {
    let state = initializeFireworksState({ seed: 42, config: baseConfig });

    for (let step = 0; step < 120 && state.telemetry.secondaryBurstEvents.length === 0; step += 1) {
      state = stepFireworksState({
        previousState: state,
        config: baseConfig,
        deltaSeconds: 0.4,
        isChannelActive: true,
      });
    }

    expect(state.telemetry.secondaryBurstEvents.length).toBeGreaterThan(0);
    const firstSecondary = state.telemetry.secondaryBurstEvents[0];
    const primary = state.telemetry.primaryBurstEvents.find((event) => event.shellId === firstSecondary.shellId);
    expect(primary).toBeDefined();

    const secondaryDelay = firstSecondary.elapsedSeconds - (primary?.elapsedSeconds ?? 0);
    expect(secondaryDelay).toBeGreaterThanOrEqual(0.05);
    expect(secondaryDelay).toBeLessThanOrEqual(0.35);
  });

  it("meets primary and secondary completion windows and cleans each firework by 3.2 seconds from launch", () => {
    const state = stepForDuration({ seconds: 24, isChannelActive: true });
    expect(state.telemetry.cleanupEvents.length).toBeGreaterThan(0);

    const primaryByShell = new Map(state.telemetry.primaryBurstEvents.map((event) => [event.shellId, event]));
    const secondaryByShell = new Map(state.telemetry.secondaryBurstEvents.map((event) => [event.shellId, event]));
    const primaryCompletionByShell = new Map(state.telemetry.primaryCompletionEvents.map((event) => [event.shellId, event]));
    const secondaryCompletionByShell = new Map(state.telemetry.secondaryCompletionEvents.map((event) => [event.shellId, event]));
    const launchByShell = new Map(state.telemetry.launchEvents.map((event) => [event.shellId, event]));
    const maxTickDrift = 1 / 60;

    for (const cleanup of state.telemetry.cleanupEvents) {
      const launch = launchByShell.get(cleanup.shellId);
      const primary = primaryByShell.get(cleanup.shellId);
      const secondary = secondaryByShell.get(cleanup.shellId);
      const primaryCompletion = primaryCompletionByShell.get(cleanup.shellId);
      const secondaryCompletion = secondaryCompletionByShell.get(cleanup.shellId);

      expect(launch).toBeDefined();
      expect(primary).toBeDefined();
      expect(secondary).toBeDefined();
      expect(primaryCompletion).toBeDefined();
      expect(secondaryCompletion).toBeDefined();

      const primaryCompletionSeconds = (primaryCompletion?.elapsedSeconds ?? 0) - (primary?.elapsedSeconds ?? 0);
      expect(primaryCompletionSeconds).toBeGreaterThanOrEqual(1.2);
      expect(primaryCompletionSeconds).toBeLessThanOrEqual(2.2 + maxTickDrift);

      const secondaryCompletionSeconds = (secondaryCompletion?.elapsedSeconds ?? 0) - (secondary?.elapsedSeconds ?? 0);
      expect(secondaryCompletionSeconds).toBeGreaterThanOrEqual(1.0);
      expect(secondaryCompletionSeconds).toBeLessThanOrEqual(2.8 + maxTickDrift);

      const launchToCleanup = cleanup.elapsedSeconds - (launch?.elapsedSeconds ?? 0);
      expect(launchToCleanup).toBeLessThanOrEqual(3.2 + maxTickDrift);
    }
  });

  it("removes expired shells, particles, and queued secondary events from active arrays", () => {
    const state = stepForDuration({ seconds: 24, isChannelActive: true });
    expect(state.telemetry.cleanupEvents.length).toBeGreaterThan(0);

    for (const cleanup of state.telemetry.cleanupEvents) {
      expect(state.shells.some((shell) => shell.id === cleanup.shellId)).toBe(false);
      expect(state.particles.some((particle) => particle.shellId === cleanup.shellId)).toBe(false);
      expect(state.secondaryQueue.some((event) => event.shellId === cleanup.shellId)).toBe(false);
    }
  });
});

describe("fireworks particle cap guardrails", () => {
  it("never exceeds maxActiveParticles under sustained deterministic stress", () => {
    const stressConfig: FireworksConfig = {
      ...baseConfig,
      launchIntervalMinSeconds: 0.2,
      launchIntervalMaxSeconds: 0.2,
      shellSpeedMin: 18,
      shellSpeedMax: 24,
      particleLifetimeMinSeconds: 2.4,
      particleLifetimeMaxSeconds: 8,
      secondaryDelayMinSeconds: 0.05,
      secondaryDelayMaxSeconds: 0.05,
      maxActiveParticles: 48,
    };

    let state = initializeFireworksState({ seed: 42, config: stressConfig });
    const deltaSeconds = 1 / 30;

    for (let step = 0; step < 900; step += 1) {
      state = stepFireworksState({
        previousState: state,
        config: stressConfig,
        deltaSeconds,
        isChannelActive: true,
      });
      expect(state.snapshot.activeParticles).toBeLessThanOrEqual(stressConfig.maxActiveParticles);
      expect(state.particles.length).toBeLessThanOrEqual(stressConfig.maxActiveParticles);
    }

    expect(state.telemetry.droppedSecondary).toBeGreaterThan(0);
  });

  it("records secondary degradation before any primary reductions under cap pressure", () => {
    const stressConfig: FireworksConfig = {
      ...baseConfig,
      launchIntervalMinSeconds: 0.2,
      launchIntervalMaxSeconds: 0.2,
      shellSpeedMin: 18,
      shellSpeedMax: 24,
      particleLifetimeMinSeconds: 2.8,
      particleLifetimeMaxSeconds: 8,
      secondaryDelayMinSeconds: 0.05,
      secondaryDelayMaxSeconds: 0.05,
      maxActiveParticles: 48,
    };

    let state = initializeFireworksState({ seed: 7, config: stressConfig });
    const deltaSeconds = 1 / 30;
    let firstDropCounters: { droppedSecondary: number; droppedPrimary: number } | null = null;

    for (let step = 0; step < 900; step += 1) {
      const previousSecondaryDrops = state.telemetry.droppedSecondary;
      const previousPrimaryDrops = state.telemetry.droppedPrimary;

      state = stepFireworksState({
        previousState: state,
        config: stressConfig,
        deltaSeconds,
        isChannelActive: true,
      });

      if (
        firstDropCounters === null
        && (state.telemetry.droppedSecondary > previousSecondaryDrops || state.telemetry.droppedPrimary > previousPrimaryDrops)
      ) {
        firstDropCounters = {
          droppedSecondary: state.telemetry.droppedSecondary,
          droppedPrimary: state.telemetry.droppedPrimary,
        };
      }
    }

    expect(firstDropCounters).not.toBeNull();
    expect(firstDropCounters?.droppedSecondary ?? 0).toBeGreaterThan(0);
    expect(firstDropCounters?.droppedPrimary ?? 0).toBe(0);

    if (state.telemetry.droppedPrimary > 0) {
      expect(state.telemetry.droppedSecondary).toBeGreaterThan(0);
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
