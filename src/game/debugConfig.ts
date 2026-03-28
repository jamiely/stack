import type { DebugConfig } from "./types";

export const defaultDebugConfig: DebugConfig = {
  cameraHeight: 8,
  cameraDistance: 12,
  cameraLerp: 0.08,
  baseWidth: 4,
  baseDepth: 4,
  slabHeight: 1,
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
  prebuiltLevels: 3,
  debrisLifetime: 1.35,
  debrisTumbleSpeed: 1,
  gridVisible: true,
};

export function clampDebugConfig(config: DebugConfig): DebugConfig {
  return {
    cameraHeight: clamp(config.cameraHeight, 4, 20),
    cameraDistance: clamp(config.cameraDistance, 7, 24),
    cameraLerp: clamp(config.cameraLerp, 0.02, 0.25),
    baseWidth: clamp(config.baseWidth, 2, 8),
    baseDepth: clamp(config.baseDepth, 2, 8),
    slabHeight: clamp(config.slabHeight, 0.5, 2),
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
    prebuiltLevels: Math.round(clamp(config.prebuiltLevels, 1, 8)),
    debrisLifetime: clamp(config.debrisLifetime, 0.4, 4),
    debrisTumbleSpeed: clamp(config.debrisTumbleSpeed, 0.2, 3),
    gridVisible: config.gridVisible,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
