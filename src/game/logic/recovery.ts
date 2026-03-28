import type { ComboState } from "./streak";
import type { SlabData } from "../types";

export interface RecoveryState {
  rewardsEarned: number;
  slowdownPlacementsRemaining: number;
}

export interface RecoveryRewardConfig {
  baseWidth: number;
  baseDepth: number;
  growthMultiplier: number;
  slowdownPlacements: number;
}

export interface RecoveryResolution {
  state: RecoveryState;
  landedSlab: SlabData;
  triggered: boolean;
}

export function createRecoveryState(): RecoveryState {
  return {
    rewardsEarned: 0,
    slowdownPlacementsRemaining: 0,
  };
}

export function applyPlacementRecoveryTick(state: RecoveryState): RecoveryState {
  if (state.slowdownPlacementsRemaining <= 0) {
    return state;
  }

  return {
    ...state,
    slowdownPlacementsRemaining: state.slowdownPlacementsRemaining - 1,
  };
}

export function getRecoverySpeedMultiplier(state: RecoveryState, slowdownFactor: number): number {
  if (state.slowdownPlacementsRemaining <= 0) {
    return 1;
  }

  return clamp(slowdownFactor, 0.25, 1);
}

export function resolveRecoveryReward(
  state: RecoveryState,
  combo: ComboState,
  landedSlab: SlabData,
  config: RecoveryRewardConfig,
): RecoveryResolution {
  const milestonesReached = Math.floor(combo.current / Math.max(1, combo.target));
  if (milestonesReached <= state.rewardsEarned) {
    return {
      state,
      landedSlab,
      triggered: false,
    };
  }

  return {
    state: {
      rewardsEarned: milestonesReached,
      slowdownPlacementsRemaining: Math.max(0, Math.round(config.slowdownPlacements)),
    },
    landedSlab: {
      ...landedSlab,
      dimensions: {
        ...landedSlab.dimensions,
        width: growDimension(landedSlab.dimensions.width, config.baseWidth, config.growthMultiplier),
        depth: growDimension(landedSlab.dimensions.depth, config.baseDepth, config.growthMultiplier),
      },
    },
    triggered: true,
  };
}

function growDimension(current: number, base: number, multiplier: number): number {
  const clampedMultiplier = Math.max(1, multiplier);
  if (current >= base) {
    return base;
  }

  return Math.min(base, current * clampedMultiplier);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
