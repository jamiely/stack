import { normalizeSeed } from "./random";

const MIN_LAUNCH_INTERVAL_SECONDS = 0.2;
const MAX_LAUNCH_INTERVAL_SECONDS = 6;
const MIN_SHELL_SPEED = 1;
const MAX_SHELL_SPEED = 120;
const MAX_SHELL_GRAVITY = 200;
const MIN_SECONDARY_DELAY_SECONDS = 0;
const MAX_SECONDARY_DELAY_SECONDS = 4;
const MIN_PARTICLE_LIFETIME_SECONDS = 0.1;
const MAX_PARTICLE_LIFETIME_SECONDS = 8;
const MIN_ACTIVE_PARTICLE_CAP = 32;
const MAX_ACTIVE_PARTICLE_CAP = 10_000;
const MIN_TRAIL_TICKS = 1;
const MAX_TRAIL_TICKS = 240;

export interface FireworksConfig {
  launchIntervalMinSeconds: number;
  launchIntervalMaxSeconds: number;
  shellSpeedMin: number;
  shellSpeedMax: number;
  shellGravity: number;
  shellTrailTicksMin: number;
  shellTrailTicksMax: number;
  secondaryDelayMinSeconds: number;
  secondaryDelayMaxSeconds: number;
  particleLifetimeMinSeconds: number;
  particleLifetimeMaxSeconds: number;
  maxActiveParticles: number;
  spawnXMin: number;
  spawnXMax: number;
  spawnZMin: number;
  spawnZMax: number;
}

export interface SanitizedFireworksConfig extends FireworksConfig {}

export interface FireworkShellState {
  id: string;
  x: number;
  y: number;
  z: number;
  vy: number;
  ageSeconds: number;
}

export interface FireworkParticleState {
  id: string;
  shellId: string;
  x: number;
  y: number;
  z: number;
  ageSeconds: number;
  lifetimeSeconds: number;
}

export interface FireworksTelemetry {
  launches: number;
  primaryBursts: number;
  secondaryBursts: number;
  droppedSecondary: number;
  droppedPrimary: number;
  sampledNoise: number;
}

export interface FireworksSnapshot {
  tick: number;
  elapsedSeconds: number;
  activeShells: number;
  activeParticles: number;
  launches: number;
  nextLaunchInSeconds: number;
  sampledNoise: number;
}

export interface FireworksState {
  seed: number;
  rngCursor: number;
  tick: number;
  elapsedSeconds: number;
  nextLaunchInSeconds: number;
  nextShellId: number;
  shells: FireworkShellState[];
  particles: FireworkParticleState[];
  telemetry: FireworksTelemetry;
  snapshot: FireworksSnapshot;
}

export interface InitializeFireworksStateInput {
  seed: number;
  config: FireworksConfig;
}

export interface StepFireworksStateInput {
  previousState: FireworksState;
  config: FireworksConfig;
  deltaSeconds: number;
  isChannelActive: boolean;
}

export function sanitizeFireworksConfig(config: FireworksConfig): SanitizedFireworksConfig {
  const launchIntervals = normalizeMinMax(
    config.launchIntervalMinSeconds,
    config.launchIntervalMaxSeconds,
    MIN_LAUNCH_INTERVAL_SECONDS,
    MAX_LAUNCH_INTERVAL_SECONDS,
  );
  const shellSpeeds = normalizeMinMax(config.shellSpeedMin, config.shellSpeedMax, MIN_SHELL_SPEED, MAX_SHELL_SPEED);
  const shellTrailTicks = normalizeMinMaxInt(config.shellTrailTicksMin, config.shellTrailTicksMax, MIN_TRAIL_TICKS, MAX_TRAIL_TICKS);
  const secondaryDelay = normalizeMinMax(
    config.secondaryDelayMinSeconds,
    config.secondaryDelayMaxSeconds,
    MIN_SECONDARY_DELAY_SECONDS,
    MAX_SECONDARY_DELAY_SECONDS,
  );
  const particleLifetime = normalizeMinMax(
    config.particleLifetimeMinSeconds,
    config.particleLifetimeMaxSeconds,
    MIN_PARTICLE_LIFETIME_SECONDS,
    MAX_PARTICLE_LIFETIME_SECONDS,
  );
  const spawnX = normalizeUnorderedPair(config.spawnXMin, config.spawnXMax, -500, 500);
  const spawnZ = normalizeUnorderedPair(config.spawnZMin, config.spawnZMax, -500, 500);

  return {
    launchIntervalMinSeconds: launchIntervals.min,
    launchIntervalMaxSeconds: launchIntervals.max,
    shellSpeedMin: shellSpeeds.min,
    shellSpeedMax: shellSpeeds.max,
    shellGravity: clampFinite(config.shellGravity, 0, MAX_SHELL_GRAVITY, 0),
    shellTrailTicksMin: shellTrailTicks.min,
    shellTrailTicksMax: shellTrailTicks.max,
    secondaryDelayMinSeconds: secondaryDelay.min,
    secondaryDelayMaxSeconds: secondaryDelay.max,
    particleLifetimeMinSeconds: particleLifetime.min,
    particleLifetimeMaxSeconds: particleLifetime.max,
    maxActiveParticles: clampIntFinite(config.maxActiveParticles, MIN_ACTIVE_PARTICLE_CAP, MAX_ACTIVE_PARTICLE_CAP, MIN_ACTIVE_PARTICLE_CAP),
    spawnXMin: spawnX.min,
    spawnXMax: spawnX.max,
    spawnZMin: spawnZ.min,
    spawnZMax: spawnZ.max,
  };
}

export function initializeFireworksState({ seed, config }: InitializeFireworksStateInput): FireworksState {
  const sanitizedConfig = sanitizeFireworksConfig(config);
  const normalizedSeed = normalizeSeed(seed);
  const first = sampleNoise(normalizedSeed, 0);
  const nextLaunchInSeconds = lerp(
    sanitizedConfig.launchIntervalMinSeconds,
    sanitizedConfig.launchIntervalMaxSeconds,
    first,
  );

  const state: FireworksState = {
    seed: normalizedSeed,
    rngCursor: 1,
    tick: 0,
    elapsedSeconds: 0,
    nextLaunchInSeconds,
    nextShellId: 0,
    shells: [],
    particles: [],
    telemetry: {
      launches: 0,
      primaryBursts: 0,
      secondaryBursts: 0,
      droppedSecondary: 0,
      droppedPrimary: 0,
      sampledNoise: first,
    },
    snapshot: {
      tick: 0,
      elapsedSeconds: 0,
      activeShells: 0,
      activeParticles: 0,
      launches: 0,
      nextLaunchInSeconds,
      sampledNoise: first,
    },
  };

  return state;
}

export function stepFireworksState({ previousState, config, deltaSeconds, isChannelActive }: StepFireworksStateInput): FireworksState {
  const sanitizedConfig = sanitizeFireworksConfig(config);
  const dt = clampFinite(deltaSeconds, 0, 5, 0);
  const sampledNoise = sampleNoise(previousState.seed, previousState.rngCursor);
  const nextRngCursor = previousState.rngCursor + 1;

  const nextShells = previousState.shells
    .map((shell) => ({
      ...shell,
      ageSeconds: shell.ageSeconds + dt,
      vy: shell.vy - sanitizedConfig.shellGravity * dt,
      y: shell.y + shell.vy * dt,
    }))
    .filter((shell) => shell.ageSeconds <= sanitizedConfig.particleLifetimeMaxSeconds);

  let launches = previousState.telemetry.launches;
  let nextLaunchInSeconds = Math.max(0, previousState.nextLaunchInSeconds - dt);
  let nextShellId = previousState.nextShellId;

  if (isChannelActive && nextLaunchInSeconds <= 0) {
    launches += 1;
    nextShells.push(createShell({ state: previousState, config: sanitizedConfig, sampledNoise }));
    nextShellId += 1;
    nextLaunchInSeconds = lerp(
      sanitizedConfig.launchIntervalMinSeconds,
      sanitizedConfig.launchIntervalMaxSeconds,
      sampledNoise,
    );
  }

  const nextState: FireworksState = {
    seed: previousState.seed,
    rngCursor: nextRngCursor,
    tick: previousState.tick + 1,
    elapsedSeconds: previousState.elapsedSeconds + dt,
    nextLaunchInSeconds,
    nextShellId,
    shells: nextShells,
    particles: previousState.particles,
    telemetry: {
      ...previousState.telemetry,
      launches,
      sampledNoise,
    },
    snapshot: {
      tick: previousState.tick + 1,
      elapsedSeconds: previousState.elapsedSeconds + dt,
      activeShells: nextShells.length,
      activeParticles: previousState.particles.length,
      launches,
      nextLaunchInSeconds,
      sampledNoise,
    },
  };

  return nextState;
}

function createShell({
  state,
  config,
  sampledNoise,
}: {
  state: FireworksState;
  config: SanitizedFireworksConfig;
  sampledNoise: number;
}): FireworkShellState {
  return {
    id: `shell-${state.nextShellId}`,
    x: lerp(config.spawnXMin, config.spawnXMax, sampledNoise),
    y: 0,
    z: lerp(config.spawnZMin, config.spawnZMax, 1 - sampledNoise),
    vy: lerp(config.shellSpeedMin, config.shellSpeedMax, sampledNoise),
    ageSeconds: 0,
  };
}

function sampleNoise(seed: number, cursor: number): number {
  let state = normalizeSeed(seed + cursor * 0x9e3779b9);
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function normalizeMinMax(minValue: number, maxValue: number, rangeMin: number, rangeMax: number): { min: number; max: number } {
  const min = clampFinite(minValue, rangeMin, rangeMax, rangeMin);
  const max = clampFinite(maxValue, rangeMin, rangeMax, rangeMax);
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

function normalizeMinMaxInt(minValue: number, maxValue: number, rangeMin: number, rangeMax: number): { min: number; max: number } {
  const min = clampIntFinite(minValue, rangeMin, rangeMax, rangeMin);
  const max = clampIntFinite(maxValue, rangeMin, rangeMax, rangeMax);
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

function normalizeUnorderedPair(a: number, b: number, rangeMin: number, rangeMax: number): { min: number; max: number } {
  const first = clampFinite(a, rangeMin, rangeMax, 0);
  const second = clampFinite(b, rangeMin, rangeMax, 0);
  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
}

function clampFinite(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return clamp(value, min, max);
}

function clampIntFinite(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.floor(clamp(value, min, max));
}

function lerp(min: number, max: number, alpha: number): number {
  const clampedAlpha = clamp(alpha, 0, 1);
  return min + (max - min) * clampedAlpha;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
