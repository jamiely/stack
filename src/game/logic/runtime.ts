import type { DistractionChannel } from "./distractions";
import type { DebugConfig, TestModeOptions } from "../types";

export const FIXED_STEP_DEFAULT_SECONDS = 1 / 60;
export const UFO_ORBIT_ANGULAR_SPEED = 0.95;

export function readTestModeOptions(search: string): TestModeOptions {
  const params = new URLSearchParams(search);
  const enabled = params.has("test") || params.has("testMode");
  const startPaused = enabled && params.get("paused") !== "0";
  const stepParam = Number(params.get("step"));
  const fixedStepSeconds =
    Number.isFinite(stepParam) && stepParam > 0 && stepParam <= 0.25 ? stepParam : FIXED_STEP_DEFAULT_SECONDS;

  const seedRaw = params.get("seed");
  const seedParam = seedRaw === null ? Number.NaN : Number(seedRaw);
  const seed = Number.isFinite(seedParam) ? Math.trunc(seedParam) : null;

  return {
    enabled,
    startPaused,
    fixedStepSeconds,
    seed,
  };
}

export function createDistractionTimerRecord(value: number): Record<DistractionChannel, number> {
  return {
    tentacle: value,
    gorilla: value,
    tremor: value,
    ufo: value,
    contrastWash: value,
    clouds: value,
    fireworks: value,
  };
}

export function tickDistractionTimerRecord(
  record: Record<DistractionChannel, number>,
  channels: readonly DistractionChannel[],
  deltaSeconds: number,
): void {
  if (deltaSeconds <= 0) {
    return;
  }

  channels.forEach((channel) => {
    const remaining = record[channel];
    if (remaining <= 0) {
      return;
    }

    record[channel] = Math.max(0, remaining - deltaSeconds);
  });
}

export function canForceDistractionChannel(channel: DistractionChannel, config: DebugConfig): boolean {
  if (!config.distractionsEnabled) {
    return false;
  }

  switch (channel) {
    case "tentacle":
      return config.distractionTentacleEnabled;
    case "gorilla":
      return config.distractionGorillaEnabled;
    case "tremor":
      return config.distractionTremorEnabled;
    case "ufo":
      return config.distractionUfoEnabled;
    case "contrastWash":
      return config.distractionContrastEnabled;
    case "clouds":
      return config.distractionCloudEnabled;
    case "fireworks":
      return config.distractionFireworksEnabled;
    default:
      return false;
  }
}

export function getUfoOrbitDurationSeconds(distractionMotionSpeed: number): number {
  const speed = Math.max(0.2, distractionMotionSpeed);
  return (Math.PI * 2) / (UFO_ORBIT_ANGULAR_SPEED * speed);
}
