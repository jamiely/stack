import type { IntegrityTier, IntegrityTelemetry } from "./integrity";
import type { TrimResult } from "../types";

export type CollapseTrigger = "miss" | "instability";

export interface CollapseConfig {
  durationSeconds: number;
  tiltStrength: number;
  pullbackDistance: number;
  dropDistance: number;
}

export interface CollapseSequenceState {
  trigger: CollapseTrigger;
  elapsedSeconds: number;
  durationSeconds: number;
  direction: {
    x: number;
    z: number;
  };
  tiltStrength: number;
  pullbackDistance: number;
  dropDistance: number;
}

export interface CollapseFrame {
  progress: number;
  stackTiltX: number;
  stackTiltZ: number;
  stackDropY: number;
  cameraPullback: number;
  cameraDrop: number;
  completed: boolean;
}

export function shouldTriggerCollapse(outcome: TrimResult["outcome"], integrityTier: IntegrityTier): boolean {
  return outcome === "miss" || integrityTier === "unstable";
}

export function resolveSupplementalCollapseBurstSlabs<T>(
  trigger: CollapseTrigger,
  options: { missedActiveSlab?: T | null },
): T[] {
  if (trigger === "miss") {
    return [];
  }

  return options.missedActiveSlab ? [options.missedActiveSlab] : [];
}

export function createCollapseSequence(
  trigger: CollapseTrigger,
  offset: IntegrityTelemetry["offset"],
  config: CollapseConfig,
): CollapseSequenceState {
  const direction = resolveDirection(offset);

  return {
    trigger,
    elapsedSeconds: 0,
    durationSeconds: Math.max(0.3, config.durationSeconds),
    direction,
    tiltStrength: Math.max(0.05, config.tiltStrength),
    pullbackDistance: Math.max(0, config.pullbackDistance),
    dropDistance: Math.max(0, config.dropDistance),
  };
}

export function advanceCollapseSequence(state: CollapseSequenceState, deltaSeconds: number): CollapseSequenceState {
  return {
    ...state,
    elapsedSeconds: Math.min(state.durationSeconds, state.elapsedSeconds + Math.max(0, deltaSeconds)),
  };
}

export function sampleCollapseFrame(state: CollapseSequenceState): CollapseFrame {
  const progress = clamp01(state.elapsedSeconds / Math.max(0.001, state.durationSeconds));
  const eased = easeOutCubic(progress);

  return {
    progress,
    stackTiltX: state.direction.z * state.tiltStrength * eased,
    stackTiltZ: -state.direction.x * state.tiltStrength * eased,
    stackDropY: state.dropDistance * eased,
    cameraPullback: state.pullbackDistance * eased,
    cameraDrop: state.dropDistance * 0.55 * eased,
    completed: progress >= 1,
  };
}

function resolveDirection(offset: { x: number; z: number }): { x: number; z: number } {
  const magnitude = Math.hypot(offset.x, offset.z);
  if (magnitude < 0.0001) {
    return { x: 1, z: 0 };
  }

  return {
    x: offset.x / magnitude,
    z: offset.z / magnitude,
  };
}

function easeOutCubic(value: number): number {
  const clamped = clamp01(value);
  return 1 - (1 - clamped) ** 3;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
