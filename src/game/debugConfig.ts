import type { DebugConfig } from "./types";

export const defaultDebugConfig: DebugConfig = {
  cameraHeight: 8,
  cameraDistance: 12,
  cameraLerp: 0.08,
  motionRange: 4.5,
  motionSpeed: 1.2,
  gridVisible: true,
};

export function clampDebugConfig(config: DebugConfig): DebugConfig {
  return {
    cameraHeight: clamp(config.cameraHeight, 4, 20),
    cameraDistance: clamp(config.cameraDistance, 7, 24),
    cameraLerp: clamp(config.cameraLerp, 0.02, 0.25),
    motionRange: clamp(config.motionRange, 1, 10),
    motionSpeed: clamp(config.motionSpeed, 0.2, 3),
    gridVisible: config.gridVisible,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
