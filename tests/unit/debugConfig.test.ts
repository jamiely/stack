import { describe, expect, it } from "vitest";
import { clampDebugConfig, defaultDebugConfig } from "../../src/game/debugConfig";
import { canForceDistractionChannel } from "../../src/game/logic/runtime";

describe("clampDebugConfig", () => {
  it("preserves values inside the accepted range", () => {
    expect(clampDebugConfig(defaultDebugConfig)).toEqual(defaultDebugConfig);
  });

  it("clamps out-of-range numeric values", () => {
    expect(
      clampDebugConfig({
        cameraHeight: 99,
        cameraDistance: 2,
        cameraLerp: 0.7,
        cameraFramingOffset: 9,
        cameraYOffset: 99,
        baseWidth: 12,
        baseDepth: 1,
        slabHeight: 8,
        motionRange: -5,
        motionSpeed: 7,
        speedRamp: 9,
        perfectTolerance: 1,
        comboTarget: 99,
        recoveryGrowthMultiplier: 2,
        recoverySlowdownFactor: 0,
        recoverySlowdownPlacements: 99,
        feedbackAudioEnabled: true,
        feedbackHapticsEnabled: false,
        distractionsEnabled: true,
        distractionMotionSpeed: 99,
        distractionTentacleEnabled: true,
        distractionTentacleStartLevel: -10,
        distractionGorillaEnabled: false,
        distractionGorillaStartLevel: 99,
        distractionTremorEnabled: true,
        distractionUfoEnabled: true,
        distractionUfoStartLevel: -30,
        distractionBatEnabled: true,
        distractionBatStartLevel: -40,
        distractionContrastEnabled: false,
        distractionCloudEnabled: true,
        distractionCloudStartLevel: 999,
        distractionCloudCount: 999,
        distractionCloudDriftSpeed: 99,
        distractionCloudSpawnBandAbove: -4,
        distractionCloudDespawnBandBelow: 99,
        distractionFireworksEnabled: false,
        distractionFireworksStartLevel: 999,
        distractionFireworksLaunchIntervalMinSeconds: -1,
        distractionFireworksLaunchIntervalMaxSeconds: 99,
        distractionFireworksShellSpeedMin: -10,
        distractionFireworksShellSpeedMax: 999,
        distractionFireworksShellGravity: 999,
        distractionFireworksShellTrailTicksMin: -20,
        distractionFireworksShellTrailTicksMax: 999,
        distractionFireworksSecondaryDelayMinSeconds: -2,
        distractionFireworksSecondaryDelayMaxSeconds: 99,
        distractionFireworksParticleLifetimeMinSeconds: 0,
        distractionFireworksParticleLifetimeMaxSeconds: 99,
        distractionFireworksMaxActiveParticles: 2,
        distractionFireworksPrimaryParticleCount: 999,
        distractionFireworksSecondaryParticleCount: -99,
        distractionFireworksRingBias: 7,
        distractionFireworksRadialJitter: -3,
        distractionFireworksVerticalBias: -7,
        distractionFireworksSpeedJitter: 4,
        dayNightCycleBlocks: 1,
        integrityPrecariousThreshold: 0,
        integrityUnstableThreshold: 2,
        integrityWobbleStrength: 99,
        collapseDurationSeconds: 99,
        collapseTiltStrength: 0,
        collapseCameraPullback: 99,
        collapseDropDistance: 0,
        performanceQualityPreset: 99,
        performanceAutoQualityEnabled: false,
        performanceFrameBudgetMs: 3,
        archivalKeepRecentLevels: 2,
        archivalChunkSize: 99,
        lodNearDistance: 0,
        lodFarDistance: 1,
        maxActiveDebris: 999,
        debrisPoolLimit: -1,
        prebuiltLevels: 99,
        debrisLifetime: 0.1,
        debrisTumbleSpeed: -1,
        placementShakeAmount: 99,
        tremorShakeAmount: 99,
        gridVisible: true,
      }),
    ).toEqual({
      cameraHeight: 20,
      cameraDistance: 7,
      cameraLerp: 0.25,
      cameraFramingOffset: 4,
      cameraYOffset: 6,
      baseWidth: 8,
      baseDepth: 2,
      slabHeight: 5,
      motionRange: 1,
      motionSpeed: 5,
      speedRamp: 0.8,
      perfectTolerance: 0.5,
      comboTarget: 12,
      recoveryGrowthMultiplier: 1.5,
      recoverySlowdownFactor: 0.25,
      recoverySlowdownPlacements: 8,
      feedbackAudioEnabled: true,
      feedbackHapticsEnabled: false,
      distractionsEnabled: true,
      distractionMotionSpeed: 3,
      distractionTentacleEnabled: true,
      distractionTentacleStartLevel: 0,
      distractionGorillaEnabled: false,
      distractionGorillaStartLevel: 80,
      distractionTremorEnabled: true,
      distractionUfoEnabled: true,
      distractionUfoStartLevel: 0,
      distractionBatEnabled: true,
      distractionBatStartLevel: 0,
      distractionContrastEnabled: false,
      distractionCloudEnabled: true,
      distractionCloudStartLevel: 120,
      distractionCloudCount: 12,
      distractionCloudDriftSpeed: 4,
      distractionCloudSpawnBandAbove: 30,
      distractionCloudDespawnBandBelow: 29.5,
      distractionFireworksEnabled: false,
      distractionFireworksStartLevel: 120,
      distractionFireworksLaunchIntervalMinSeconds: 0.2,
      distractionFireworksLaunchIntervalMaxSeconds: 6,
      distractionFireworksShellSpeedMin: 1,
      distractionFireworksShellSpeedMax: 120,
      distractionFireworksShellGravity: 200,
      distractionFireworksShellTrailTicksMin: 1,
      distractionFireworksShellTrailTicksMax: 240,
      distractionFireworksSecondaryDelayMinSeconds: 0,
      distractionFireworksSecondaryDelayMaxSeconds: 4,
      distractionFireworksParticleLifetimeMinSeconds: 0.1,
      distractionFireworksParticleLifetimeMaxSeconds: 8,
      distractionFireworksMaxActiveParticles: 32,
      distractionFireworksPrimaryParticleCount: 120,
      distractionFireworksSecondaryParticleCount: 1,
      distractionFireworksRingBias: 1,
      distractionFireworksRadialJitter: 0,
      distractionFireworksVerticalBias: -1,
      distractionFireworksSpeedJitter: 1,
      dayNightCycleBlocks: 4,
      integrityPrecariousThreshold: 0.35,
      integrityUnstableThreshold: 1.2,
      integrityWobbleStrength: 1.5,
      collapseDurationSeconds: 3,
      collapseTiltStrength: 0.1,
      collapseCameraPullback: 12,
      collapseDropDistance: 0.5,
      performanceQualityPreset: 2,
      performanceAutoQualityEnabled: false,
      performanceFrameBudgetMs: 10,
      archivalKeepRecentLevels: 4,
      archivalChunkSize: 16,
      lodNearDistance: 2,
      lodFarDistance: 4,
      maxActiveDebris: 80,
      debrisPoolLimit: 0,
      prebuiltLevels: 12,
      debrisLifetime: 0.4,
      debrisTumbleSpeed: 0.2,
      placementShakeAmount: 1.5,
      tremorShakeAmount: 3,
      gridVisible: true,
    });
  });

  it("normalizes fireworks min/max controls and cap bounds", () => {
    const clamped = clampDebugConfig({
      ...defaultDebugConfig,
      distractionFireworksLaunchIntervalMinSeconds: 3.2,
      distractionFireworksLaunchIntervalMaxSeconds: 1.8,
      distractionFireworksShellSpeedMin: 48,
      distractionFireworksShellSpeedMax: 12,
      distractionFireworksShellTrailTicksMin: 40,
      distractionFireworksShellTrailTicksMax: 6,
      distractionFireworksSecondaryDelayMinSeconds: 0.45,
      distractionFireworksSecondaryDelayMaxSeconds: 0.1,
      distractionFireworksParticleLifetimeMinSeconds: 3.2,
      distractionFireworksParticleLifetimeMaxSeconds: 1.2,
      distractionFireworksMaxActiveParticles: 50000,
    });

    expect(clamped.distractionFireworksLaunchIntervalMinSeconds).toBe(1.8);
    expect(clamped.distractionFireworksLaunchIntervalMaxSeconds).toBe(3.2);
    expect(clamped.distractionFireworksShellSpeedMin).toBe(12);
    expect(clamped.distractionFireworksShellSpeedMax).toBe(48);
    expect(clamped.distractionFireworksShellTrailTicksMin).toBe(6);
    expect(clamped.distractionFireworksShellTrailTicksMax).toBe(40);
    expect(clamped.distractionFireworksSecondaryDelayMinSeconds).toBe(0.1);
    expect(clamped.distractionFireworksSecondaryDelayMaxSeconds).toBe(0.45);
    expect(clamped.distractionFireworksParticleLifetimeMinSeconds).toBe(1.2);
    expect(clamped.distractionFireworksParticleLifetimeMaxSeconds).toBe(3.2);
    expect(clamped.distractionFireworksMaxActiveParticles).toBe(10000);
  });

  it("clamps fireworks morphology controls and rounds count controls", () => {
    const clamped = clampDebugConfig({
      ...defaultDebugConfig,
      distractionFireworksPrimaryParticleCount: 40.7,
      distractionFireworksSecondaryParticleCount: 0.2,
      distractionFireworksRingBias: 9,
      distractionFireworksRadialJitter: -1,
      distractionFireworksVerticalBias: 4,
      distractionFireworksSpeedJitter: 0.34,
    });

    expect(clamped.distractionFireworksPrimaryParticleCount).toBe(41);
    expect(clamped.distractionFireworksSecondaryParticleCount).toBe(1);
    expect(clamped.distractionFireworksRingBias).toBe(1);
    expect(clamped.distractionFireworksRadialJitter).toBe(0);
    expect(clamped.distractionFireworksVerticalBias).toBe(1);
    expect(clamped.distractionFireworksSpeedJitter).toBe(0.34);
  });

  it("sanitizes non-finite fireworks morphology controls to finite defaults", () => {
    const clamped = clampDebugConfig({
      ...defaultDebugConfig,
      distractionFireworksPrimaryParticleCount: Number.NaN,
      distractionFireworksSecondaryParticleCount: Number.POSITIVE_INFINITY,
      distractionFireworksRingBias: Number.NaN,
      distractionFireworksRadialJitter: Number.NEGATIVE_INFINITY,
      distractionFireworksVerticalBias: Number.NaN,
      distractionFireworksSpeedJitter: Number.NaN,
    });

    expect(clamped.distractionFireworksPrimaryParticleCount).toBe(defaultDebugConfig.distractionFireworksPrimaryParticleCount);
    expect(clamped.distractionFireworksSecondaryParticleCount).toBe(defaultDebugConfig.distractionFireworksSecondaryParticleCount);
    expect(clamped.distractionFireworksRingBias).toBe(defaultDebugConfig.distractionFireworksRingBias);
    expect(clamped.distractionFireworksRadialJitter).toBe(defaultDebugConfig.distractionFireworksRadialJitter);
    expect(clamped.distractionFireworksVerticalBias).toBe(defaultDebugConfig.distractionFireworksVerticalBias);
    expect(clamped.distractionFireworksSpeedJitter).toBe(defaultDebugConfig.distractionFireworksSpeedJitter);
  });

  it("sanitizes cloud lifecycle controls and preserves explicit zero drift", () => {
    const clamped = clampDebugConfig({
      ...defaultDebugConfig,
      distractionCloudDriftSpeed: 0,
      distractionCloudSpawnBandAbove: 1,
      distractionCloudDespawnBandBelow: 3,
    });

    expect(clamped.distractionCloudDriftSpeed).toBe(0);
    expect(clamped.distractionCloudSpawnBandAbove).toBeGreaterThanOrEqual(clamped.distractionCloudDespawnBandBelow + 0.5);
  });

  it("keeps fireworks force-launch action available when channel is enabled", () => {
    const clamped = clampDebugConfig({
      ...defaultDebugConfig,
      distractionsEnabled: true,
      distractionFireworksEnabled: true,
    });

    expect(canForceDistractionChannel("fireworks", clamped)).toBe(true);
    expect(canForceDistractionChannel("fireworks", { ...clamped, distractionFireworksEnabled: false })).toBe(false);
  });
});
