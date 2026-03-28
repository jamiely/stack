import type { TrimResult } from "../types";

export type FeedbackEvent = "placement_perfect" | "placement_landed" | "placement_miss" | "collapse_failure";

export interface AudioToneStep {
  frequency: number;
  durationMs: number;
  gain: number;
  offsetMs: number;
  type: OscillatorType;
}

export interface FeedbackPlan {
  event: FeedbackEvent;
  audio: AudioToneStep[];
  hapticPattern: number | number[] | null;
}

export type FailureFeedbackTrigger = "miss" | "instability";

const PERFECT_PLAN: FeedbackPlan = {
  event: "placement_perfect",
  audio: [
    { frequency: 920, durationMs: 60, gain: 0.07, offsetMs: 0, type: "triangle" },
    { frequency: 1260, durationMs: 70, gain: 0.06, offsetMs: 42, type: "triangle" },
  ],
  hapticPattern: 12,
};

const LANDED_PLAN: FeedbackPlan = {
  event: "placement_landed",
  audio: [{ frequency: 430, durationMs: 85, gain: 0.06, offsetMs: 0, type: "square" }],
  hapticPattern: 8,
};

const MISS_PLAN: FeedbackPlan = {
  event: "placement_miss",
  audio: [
    { frequency: 240, durationMs: 180, gain: 0.08, offsetMs: 0, type: "sawtooth" },
    { frequency: 170, durationMs: 200, gain: 0.06, offsetMs: 120, type: "sawtooth" },
  ],
  hapticPattern: [16, 28, 24],
};

const COLLAPSE_PLAN_BY_TRIGGER: Record<FailureFeedbackTrigger, FeedbackPlan> = {
  miss: {
    event: "collapse_failure",
    audio: [
      { frequency: 182, durationMs: 240, gain: 0.09, offsetMs: 0, type: "sawtooth" },
      { frequency: 126, durationMs: 260, gain: 0.08, offsetMs: 140, type: "sawtooth" },
    ],
    hapticPattern: [24, 46, 52],
  },
  instability: {
    event: "collapse_failure",
    audio: [
      { frequency: 210, durationMs: 180, gain: 0.07, offsetMs: 0, type: "square" },
      { frequency: 150, durationMs: 230, gain: 0.08, offsetMs: 90, type: "sawtooth" },
    ],
    hapticPattern: [18, 24, 36],
  },
};

export function getPlacementFeedbackPlan(outcome: TrimResult["outcome"]): FeedbackPlan | null {
  if (outcome === "perfect") {
    return PERFECT_PLAN;
  }

  if (outcome === "landed") {
    return LANDED_PLAN;
  }

  if (outcome === "miss") {
    return MISS_PLAN;
  }

  return null;
}

export function getFailureFeedbackPlan(trigger: FailureFeedbackTrigger): FeedbackPlan {
  return COLLAPSE_PLAN_BY_TRIGGER[trigger];
}

export function clampToneGain(gain: number): number {
  if (!Number.isFinite(gain)) {
    return 0;
  }

  return Math.min(0.3, Math.max(0, gain));
}
