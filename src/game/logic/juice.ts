/**
 * Game-feel timing and escalation ("Juice it or lose it"). Pure: time in seconds, no three.js or DOM.
 */

/** Squash and stretch of a landing slab: flattens on impact, overshoots tall, settles. */
export const SLAM_SECONDS = 0.32;

export function sampleSlam(elapsed: number, strength = 1): { scaleY: number; scaleXZ: number } {
  const t = Math.min(1, Math.max(0, elapsed / SLAM_SECONDS));
  if (t >= 1) {
    return { scaleY: 1, scaleXZ: 1 };
  }
  // Damped spring: starts squashed (-), overshoots (+) and settles to 0.
  const squash = -Math.cos(t * Math.PI * 2.5) * Math.exp(-t * 4.2) * 0.3 * strength;
  return { scaleY: 1 + squash, scaleXZ: 1 - squash * 0.5 };
}

/** Frozen frames on impact: longer for perfects and big streaks. */
export function hitStopSeconds(outcome: "perfect" | "landed", combo: number): number {
  if (outcome === "landed") {
    return 0.04;
  }
  return Math.min(0.12, 0.06 + combo * 0.006);
}

/** Streak tiers that change the stamp and counter: 1, x2, x5, x10. */
export function comboTier(combo: number): 0 | 1 | 2 | 3 {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  if (combo >= 2) return 1;
  return 0;
}

export function comboLabel(combo: number): string {
  return combo >= 2 ? `x${combo}` : "";
}

/** Semitone offset for the drop thunk: climbs a major pentatonic with the streak, an octave and a half at most. */
export function comboSemitones(combo: number): number {
  const scale = [0, 2, 4, 7, 9];
  const step = Math.max(0, combo - 1);
  return Math.min(19, scale[step % 5]! + Math.floor(step / 5) * 12);
}

/** Floors that trigger a milestone party. */
export const MILESTONE_EVERY = 10;

export function milestoneReached(previousFloors: number, floors: number): number | null {
  const before = Math.floor(previousFloors / MILESTONE_EVERY);
  const after = Math.floor(floors / MILESTONE_EVERY);
  return after > before && floors > 0 ? after * MILESTONE_EVERY : null;
}

/** Slow motion at the start of the collapse: time scale eases from 0.25 back to 1. */
export const SLOWMO_SECONDS = 1.1;

export function slowMoScale(elapsed: number): number {
  if (elapsed >= SLOWMO_SECONDS) return 1;
  const t = Math.max(0, elapsed) / SLOWMO_SECONDS;
  return 0.25 + 0.75 * t * t;
}

/** The game-over tally counts up over this long (shorter for small scores), after the collapse has started. */
export const TALLY_DELAY_SECONDS = 0.9;

export function tallyDuration(score: number): number {
  return Math.min(2.2, 0.5 + score * 0.06);
}

/** Displayed score during the tally: eased so it decelerates into the final number. */
export function tallyValue(score: number, elapsed: number): number {
  const t = (elapsed - TALLY_DELAY_SECONDS) / tallyDuration(score);
  if (t <= 0) return 0;
  if (t >= 1) return score;
  return Math.floor(score * (1 - (1 - t) ** 3));
}

/** A slab is a near-miss when it barely overlaps: this share or less of its width survived. */
export const NEAR_MISS_RATIO = 0.25;

export function isNearMiss(keptSize: number, originalSize: number): boolean {
  return originalSize > 0 && keptSize / originalSize <= NEAR_MISS_RATIO;
}

/** Window glow wave: each floor below the top lights up this much later. */
export const WINDOW_WAVE_STEP_SECONDS = 0.05;
export const WINDOW_GLOW_SECONDS = 0.45;

export function windowGlow(elapsed: number, floorsBelowTop: number): number {
  const local = elapsed - floorsBelowTop * WINDOW_WAVE_STEP_SECONDS;
  if (local <= 0 || local >= WINDOW_GLOW_SECONDS) return 0;
  return Math.sin((local / WINDOW_GLOW_SECONDS) * Math.PI);
}
