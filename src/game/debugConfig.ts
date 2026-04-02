import { sanitizeCloudLifecycleBands } from "./logic/clouds";
import type { DebugConfig } from "./types";

export const defaultDebugConfig: DebugConfig = {
  cameraHeight: 6.75,
  cameraDistance: 12,
  cameraLerp: 0.08,
  cameraFramingOffset: 1.25,
  cameraYOffset: 0,
  baseWidth: 7,
  baseDepth: 7,
  slabHeight: 3,
  motionRange: 4.5,
  motionSpeed: 2.1,
  speedRamp: 0.16,
  perfectTolerance: 0.18,
  comboTarget: 8,
  recoveryGrowthMultiplier: 1.15,
  recoverySlowdownFactor: 0.72,
  recoverySlowdownPlacements: 3,
  feedbackAudioEnabled: true,
  feedbackHapticsEnabled: true,
  distractionsEnabled: true,
  distractionMotionSpeed: 1,
  distractionTentacleEnabled: true,
  distractionTentacleStartLevel: 4,
  distractionGorillaEnabled: true,
  distractionGorillaStartLevel: 12,
  distractionTremorEnabled: true,
  distractionUfoEnabled: true,
  distractionUfoStartLevel: 14,
  distractionBatEnabled: true,
  distractionBatStartLevel: 16,
  distractionContrastEnabled: true,
  distractionCloudEnabled: true,
  distractionCloudStartLevel: 32,
  distractionCloudCount: 3,
  distractionCloudDriftSpeed: -0.3,
  distractionCloudSpawnBandAbove: 7.5,
  distractionCloudDespawnBandBelow: 4.5,
  distractionFireworksEnabled: true,
  distractionFireworksStartLevel: 18,
  distractionFireworksLaunchIntervalMinSeconds: 0.8,
  distractionFireworksLaunchIntervalMaxSeconds: 2.4,
  distractionFireworksShellSpeedMin: 20,
  distractionFireworksShellSpeedMax: 24,
  distractionFireworksShellGravity: 46,
  distractionFireworksShellTrailTicksMin: 6,
  distractionFireworksShellTrailTicksMax: 18,
  distractionFireworksSecondaryDelayMinSeconds: 0.05,
  distractionFireworksSecondaryDelayMaxSeconds: 0.35,
  distractionFireworksParticleLifetimeMinSeconds: 1.2,
  distractionFireworksParticleLifetimeMaxSeconds: 2,
  distractionFireworksMaxActiveParticles: 240,
  distractionFireworksPrimaryParticleCount: 20,
  distractionFireworksSecondaryParticleCount: 12,
  distractionFireworksRingBias: 0,
  distractionFireworksRadialJitter: 0,
  distractionFireworksVerticalBias: 0,
  distractionFireworksSpeedJitter: 0,
  dayNightCycleBlocks: 20,
  integrityPrecariousThreshold: 0.55,
  integrityUnstableThreshold: 0.9,
  integrityWobbleStrength: 0.22,
  collapseDurationSeconds: 1.4,
  collapseTiltStrength: 0.72,
  collapseCameraPullback: 4.8,
  collapseDropDistance: 2.6,
  performanceQualityPreset: 2,
  performanceAutoQualityEnabled: true,
  performanceFrameBudgetMs: 16.7,
  archivalKeepRecentLevels: 14,
  archivalChunkSize: 5,
  lodNearDistance: 6,
  lodFarDistance: 16,
  maxActiveDebris: 24,
  debrisPoolLimit: 48,
  prebuiltLevels: 5,
  debrisLifetime: 1.35,
  debrisTumbleSpeed: 1,
  placementShakeAmount: 0.22,
  tremorShakeAmount: 1,
  gridVisible: false,
};

export function clampDebugConfig(config: DebugConfig): DebugConfig {
  const cloudLifecycleBands = sanitizeCloudLifecycleBands({
    spawnBandAboveCamera: clamp(config.distractionCloudSpawnBandAbove, 0, 30),
    despawnBandBelowCamera: clamp(config.distractionCloudDespawnBandBelow, 0, 29.5),
    minimumSeparation: 0.5,
  });
  const fireworksLaunchInterval = normalizeClampedPair(
    config.distractionFireworksLaunchIntervalMinSeconds,
    config.distractionFireworksLaunchIntervalMaxSeconds,
    0.2,
    6,
  );
  const fireworksShellSpeed = normalizeClampedPair(
    config.distractionFireworksShellSpeedMin,
    config.distractionFireworksShellSpeedMax,
    1,
    120,
  );
  const fireworksShellTrailTicks = normalizeClampedIntegerPair(
    config.distractionFireworksShellTrailTicksMin,
    config.distractionFireworksShellTrailTicksMax,
    1,
    240,
  );
  const fireworksSecondaryDelay = normalizeClampedPair(
    config.distractionFireworksSecondaryDelayMinSeconds,
    config.distractionFireworksSecondaryDelayMaxSeconds,
    0,
    4,
  );
  const fireworksParticleLifetime = normalizeClampedPair(
    config.distractionFireworksParticleLifetimeMinSeconds,
    config.distractionFireworksParticleLifetimeMaxSeconds,
    0.1,
    8,
  );

  return {
    cameraHeight: clamp(config.cameraHeight, 4, 20),
    cameraDistance: clamp(config.cameraDistance, 7, 24),
    cameraLerp: clamp(config.cameraLerp, 0.02, 0.25),
    cameraFramingOffset: clamp(config.cameraFramingOffset, -1.5, 4),
    cameraYOffset: clamp(config.cameraYOffset, -6, 6),
    baseWidth: clamp(config.baseWidth, 2, 8),
    baseDepth: clamp(config.baseDepth, 2, 8),
    slabHeight: clamp(config.slabHeight, 1, 5),
    motionRange: clamp(config.motionRange, 1, 10),
    motionSpeed: clamp(config.motionSpeed, 0.4, 5),
    speedRamp: clamp(config.speedRamp, 0, 0.8),
    perfectTolerance: clamp(config.perfectTolerance, 0, 0.5),
    comboTarget: Math.round(clamp(config.comboTarget, 2, 12)),
    recoveryGrowthMultiplier: clamp(config.recoveryGrowthMultiplier, 1, 1.5),
    recoverySlowdownFactor: clamp(config.recoverySlowdownFactor, 0.25, 1),
    recoverySlowdownPlacements: Math.round(clamp(config.recoverySlowdownPlacements, 0, 8)),
    feedbackAudioEnabled: config.feedbackAudioEnabled,
    feedbackHapticsEnabled: config.feedbackHapticsEnabled,
    distractionsEnabled: config.distractionsEnabled,
    distractionMotionSpeed: clamp(config.distractionMotionSpeed, 0.2, 3),
    distractionTentacleEnabled: config.distractionTentacleEnabled,
    distractionTentacleStartLevel: Math.round(clamp(config.distractionTentacleStartLevel, 0, 80)),
    distractionGorillaEnabled: config.distractionGorillaEnabled,
    distractionGorillaStartLevel: Math.round(clamp(config.distractionGorillaStartLevel, 0, 80)),
    distractionTremorEnabled: config.distractionTremorEnabled,
    distractionUfoEnabled: config.distractionUfoEnabled,
    distractionUfoStartLevel: Math.round(clamp(config.distractionUfoStartLevel, 0, 100)),
    distractionBatEnabled: config.distractionBatEnabled,
    distractionBatStartLevel: Math.round(clamp(config.distractionBatStartLevel, 0, 120)),
    distractionContrastEnabled: config.distractionContrastEnabled,
    distractionCloudEnabled: config.distractionCloudEnabled,
    distractionCloudStartLevel: Math.round(clamp(config.distractionCloudStartLevel, 0, 120)),
    distractionCloudCount: Math.round(clamp(config.distractionCloudCount, 0, 12)),
    distractionCloudDriftSpeed: clamp(config.distractionCloudDriftSpeed, -4, 4),
    distractionCloudSpawnBandAbove: cloudLifecycleBands.spawnBandAboveCamera,
    distractionCloudDespawnBandBelow: cloudLifecycleBands.despawnBandBelowCamera,
    distractionFireworksEnabled: config.distractionFireworksEnabled,
    distractionFireworksStartLevel: Math.round(clamp(config.distractionFireworksStartLevel, 0, 120)),
    distractionFireworksLaunchIntervalMinSeconds: fireworksLaunchInterval.min,
    distractionFireworksLaunchIntervalMaxSeconds: fireworksLaunchInterval.max,
    distractionFireworksShellSpeedMin: fireworksShellSpeed.min,
    distractionFireworksShellSpeedMax: fireworksShellSpeed.max,
    distractionFireworksShellGravity: clamp(config.distractionFireworksShellGravity, 0, 200),
    distractionFireworksShellTrailTicksMin: fireworksShellTrailTicks.min,
    distractionFireworksShellTrailTicksMax: fireworksShellTrailTicks.max,
    distractionFireworksSecondaryDelayMinSeconds: fireworksSecondaryDelay.min,
    distractionFireworksSecondaryDelayMaxSeconds: fireworksSecondaryDelay.max,
    distractionFireworksParticleLifetimeMinSeconds: fireworksParticleLifetime.min,
    distractionFireworksParticleLifetimeMaxSeconds: fireworksParticleLifetime.max,
    distractionFireworksMaxActiveParticles: Math.round(clamp(config.distractionFireworksMaxActiveParticles, 32, 10000)),
    distractionFireworksPrimaryParticleCount: clampIntFinite(
      config.distractionFireworksPrimaryParticleCount,
      1,
      120,
      defaultDebugConfig.distractionFireworksPrimaryParticleCount,
    ),
    distractionFireworksSecondaryParticleCount: clampIntFinite(
      config.distractionFireworksSecondaryParticleCount,
      1,
      120,
      defaultDebugConfig.distractionFireworksSecondaryParticleCount,
    ),
    distractionFireworksRingBias: clampFinite(
      config.distractionFireworksRingBias,
      0,
      1,
      defaultDebugConfig.distractionFireworksRingBias,
    ),
    distractionFireworksRadialJitter: clampFinite(
      config.distractionFireworksRadialJitter,
      0,
      1,
      defaultDebugConfig.distractionFireworksRadialJitter,
    ),
    distractionFireworksVerticalBias: clampFinite(
      config.distractionFireworksVerticalBias,
      -1,
      1,
      defaultDebugConfig.distractionFireworksVerticalBias,
    ),
    distractionFireworksSpeedJitter: clampFinite(
      config.distractionFireworksSpeedJitter,
      0,
      1,
      defaultDebugConfig.distractionFireworksSpeedJitter,
    ),
    dayNightCycleBlocks: Math.round(clamp(config.dayNightCycleBlocks, 4, 80)),
    integrityPrecariousThreshold: clamp(config.integrityPrecariousThreshold, 0.35, 0.85),
    integrityUnstableThreshold: clamp(
      config.integrityUnstableThreshold,
      Math.max(0.45, clamp(config.integrityPrecariousThreshold, 0.35, 0.85) + 0.05),
      1.2,
    ),
    integrityWobbleStrength: clamp(config.integrityWobbleStrength, 0, 1.5),
    collapseDurationSeconds: clamp(config.collapseDurationSeconds, 0.6, 3),
    collapseTiltStrength: clamp(config.collapseTiltStrength, 0.1, 1.3),
    collapseCameraPullback: clamp(config.collapseCameraPullback, 0, 12),
    collapseDropDistance: clamp(config.collapseDropDistance, 0.5, 8),
    performanceQualityPreset: Math.round(clamp(config.performanceQualityPreset, 0, 2)),
    performanceAutoQualityEnabled: config.performanceAutoQualityEnabled,
    performanceFrameBudgetMs: clamp(config.performanceFrameBudgetMs, 10, 40),
    archivalKeepRecentLevels: Math.round(clamp(config.archivalKeepRecentLevels, 4, 40)),
    archivalChunkSize: Math.round(clamp(config.archivalChunkSize, 2, 16)),
    lodNearDistance: Math.round(clamp(config.lodNearDistance, 2, 24)),
    lodFarDistance: Math.round(
      clamp(config.lodFarDistance, Math.max(4, Math.round(clamp(config.lodNearDistance, 2, 24)) + 2), 48),
    ),
    maxActiveDebris: Math.round(clamp(config.maxActiveDebris, 2, 80)),
    debrisPoolLimit: Math.round(clamp(config.debrisPoolLimit, 0, 120)),
    prebuiltLevels: Math.round(clamp(config.prebuiltLevels, 1, 12)),
    debrisLifetime: clamp(config.debrisLifetime, 0.4, 4),
    debrisTumbleSpeed: clamp(config.debrisTumbleSpeed, 0.2, 3),
    placementShakeAmount: clamp(config.placementShakeAmount, 0, 1.5),
    tremorShakeAmount: clamp(config.tremorShakeAmount, 0, 3),
    gridVisible: config.gridVisible,
  };
}

function normalizeClampedPair(minValue: number, maxValue: number, rangeMin: number, rangeMax: number): { min: number; max: number } {
  const min = clamp(minValue, rangeMin, rangeMax);
  const max = clamp(maxValue, rangeMin, rangeMax);
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

function normalizeClampedIntegerPair(minValue: number, maxValue: number, rangeMin: number, rangeMax: number): { min: number; max: number } {
  const normalized = normalizeClampedPair(minValue, maxValue, rangeMin, rangeMax);
  return {
    min: Math.round(normalized.min),
    max: Math.round(normalized.max),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampFinite(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return clamp(value, min, max);
}

function clampIntFinite(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.round(clamp(value, min, max));
}
