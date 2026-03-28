import { createSeededRandom } from "./random";

export type DistractionChannel = "tentacle" | "gorilla" | "tremor" | "ufo" | "contrastWash" | "clouds";

export interface DistractionConfig {
  distractionsEnabled: boolean;
  distractionMotionSpeed: number;
  distractionTentacleEnabled: boolean;
  distractionTentacleStartLevel: number;
  distractionGorillaEnabled: boolean;
  distractionGorillaStartLevel: number;
  distractionTremorEnabled: boolean;
  distractionUfoEnabled: boolean;
  distractionUfoStartLevel: number;
  distractionContrastEnabled: boolean;
  distractionCloudEnabled: boolean;
  distractionCloudStartLevel: number;
}

export interface DistractionSnapshot {
  enabled: boolean;
  level: number;
  active: Record<DistractionChannel, boolean>;
  signals: Record<DistractionChannel, number>;
}

export interface DistractionState {
  elapsedSeconds: number;
  phases: Record<DistractionChannel, number>;
  snapshot: DistractionSnapshot;
}

const CHANNELS: DistractionChannel[] = ["tentacle", "gorilla", "tremor", "ufo", "contrastWash", "clouds"];
const FREQUENCIES: Record<DistractionChannel, number> = {
  tentacle: 0.75,
  gorilla: 0.42,
  tremor: 1.5,
  ufo: 0.33,
  contrastWash: 0.56,
  clouds: 0.12,
};

export function createDistractionState(seed: number): DistractionState {
  const random = createSeededRandom(seed);
  const phases = CHANNELS.reduce<Record<DistractionChannel, number>>((result, channel) => {
    result[channel] = random() * Math.PI * 2;
    return result;
  }, {
    tentacle: 0,
    gorilla: 0,
    tremor: 0,
    ufo: 0,
    contrastWash: 0,
    clouds: 0,
  });

  return {
    elapsedSeconds: 0,
    phases,
    snapshot: {
      enabled: false,
      level: 0,
      active: createInactiveRecord(false),
      signals: createInactiveRecord(0),
    },
  };
}

export function updateDistractionState(
  state: DistractionState,
  deltaSeconds: number,
  level: number,
  config: DistractionConfig,
): DistractionState {
  const elapsedSeconds = Math.max(0, state.elapsedSeconds + Math.max(0, deltaSeconds));
  const active = {
    tentacle:
      config.distractionsEnabled &&
      config.distractionTentacleEnabled &&
      level >= config.distractionTentacleStartLevel,
    gorilla:
      config.distractionsEnabled &&
      config.distractionGorillaEnabled &&
      level >= config.distractionGorillaStartLevel,
    tremor:
      config.distractionsEnabled &&
      config.distractionTremorEnabled &&
      config.distractionGorillaEnabled &&
      level >= config.distractionGorillaStartLevel,
    ufo:
      config.distractionsEnabled &&
      config.distractionUfoEnabled &&
      level >= config.distractionUfoStartLevel,
    contrastWash:
      config.distractionsEnabled &&
      config.distractionContrastEnabled &&
      config.distractionUfoEnabled &&
      level >= config.distractionUfoStartLevel,
    clouds:
      config.distractionsEnabled &&
      config.distractionCloudEnabled &&
      level >= config.distractionCloudStartLevel,
  } satisfies Record<DistractionChannel, boolean>;

  const baseSignals = CHANNELS.reduce<Record<DistractionChannel, number>>((result, channel) => {
    const wave = Math.sin(
      elapsedSeconds * FREQUENCIES[channel] * config.distractionMotionSpeed + state.phases[channel],
    );
    result[channel] = (wave + 1) / 2;
    return result;
  }, createInactiveRecord(0));

  const tremorPulse = active.tremor
    ? pulseSignal(elapsedSeconds, state.phases.tremor, config.distractionMotionSpeed)
    : 0;

  const signals: Record<DistractionChannel, number> = {
    tentacle: active.tentacle ? baseSignals.tentacle : 0,
    gorilla: active.gorilla ? baseSignals.gorilla : 0,
    tremor: tremorPulse,
    ufo: active.ufo ? baseSignals.ufo : 0,
    contrastWash: active.contrastWash ? baseSignals.contrastWash : 0,
    clouds: active.clouds ? baseSignals.clouds : 0,
  };

  return {
    elapsedSeconds,
    phases: state.phases,
    snapshot: {
      enabled: config.distractionsEnabled,
      level,
      active,
      signals,
    },
  };
}

function createInactiveRecord<T>(value: T): Record<DistractionChannel, T> {
  return {
    tentacle: value,
    gorilla: value,
    tremor: value,
    ufo: value,
    contrastWash: value,
    clouds: value,
  };
}

function pulseSignal(elapsedSeconds: number, phase: number, speed: number): number {
  const cycle = elapsedSeconds * 0.65 * speed + phase;
  const normalized = cycle - Math.floor(cycle);
  if (normalized < 0.08) {
    return 1;
  }

  if (normalized < 0.2) {
    return Number(((0.2 - normalized) / 0.12).toFixed(6));
  }

  return 0;
}
