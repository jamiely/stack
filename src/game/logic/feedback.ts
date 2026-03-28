import type { TrimResult } from "../types";

export type FeedbackEvent = "placement_perfect" | "placement_landed" | "placement_miss";

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

export function clampToneGain(gain: number): number {
  if (!Number.isFinite(gain)) {
    return 0;
  }

  return Math.min(0.3, Math.max(0, gain));
}
