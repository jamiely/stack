import { describe, expect, it } from "vitest";
import { initializeFireworksState, stepFireworksState, type FireworksConfig } from "../../src/game/logic/fireworks";

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
  primaryParticleCount: 20,
  secondaryParticleCount: 12,
  ringBias: 0,
  radialJitter: 0,
  verticalBias: 0,
  speedJitter: 0,
  spawnXMin: -18,
  spawnXMax: 18,
  spawnZMin: -32,
  spawnZMax: -14,
};

describe("fireworks coarse-step secondary scheduling", () => {
  it("emits secondary bursts within 0.35s wall-clock of primary under dt=0.4", () => {
    let state = initializeFireworksState({ seed: 42, config: baseConfig });
    const deltaSeconds = 0.4;

    for (let step = 0; step < 120 && state.telemetry.secondaryBurstEvents.length === 0; step += 1) {
      state = stepFireworksState({
        previousState: state,
        config: baseConfig,
        deltaSeconds,
        isChannelActive: true,
      });
    }

    expect(state.telemetry.secondaryBurstEvents.length).toBeGreaterThan(0);

    const firstSecondary = state.telemetry.secondaryBurstEvents[0]!;
    const primary = state.telemetry.primaryBurstEvents.find((event) => event.shellId === firstSecondary.shellId);
    expect(primary).toBeDefined();

    const observedDelay = state.elapsedSeconds - (primary?.elapsedSeconds ?? 0);
    expect(observedDelay).toBeGreaterThanOrEqual(0.05);
    expect(observedDelay).toBeLessThanOrEqual(0.35);
  });
});
