import type { TrimResult } from "../types";

export interface ComboState {
  current: number;
  best: number;
  target: number;
  rewardReady: boolean;
}

export function createComboState(target: number): ComboState {
  return {
    current: 0,
    best: 0,
    target: Math.max(1, Math.floor(target)),
    rewardReady: false,
  };
}

export function updateComboState(state: ComboState, outcome: TrimResult["outcome"]): ComboState {
  if (outcome === "perfect") {
    const nextCurrent = state.current + 1;
    return {
      ...state,
      current: nextCurrent,
      best: Math.max(state.best, nextCurrent),
      rewardReady: nextCurrent >= state.target,
    };
  }

  return {
    ...state,
    current: 0,
    rewardReady: false,
  };
}
