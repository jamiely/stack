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
const MIN_ARC_SECONDS = 0.45;
const MAX_ARC_SECONDS = 1.1;
const MIN_PRE_BURST_TICKS = 6;

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
  ageTicks: number;
  trailTicksRequired: number;
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

export interface FireworkLaunchEvent {
  shellId: string;
  tick: number;
  elapsedSeconds: number;
}

export interface FireworkPrimaryBurstEvent {
  shellId: string;
  tick: number;
  apexTick: number;
  elapsedSeconds: number;
  shellTicks: number;
}

export interface FireworksTelemetry {
  launches: number;
  primaryBursts: number;
  secondaryBursts: number;
  droppedSecondary: number;
  droppedPrimary: number;
  sampledNoise: number;
  launchEvents: FireworkLaunchEvent[];
  primaryBurstEvents: FireworkPrimaryBurstEvent[];
}

export interface FireworksSnapshot {
  tick: number;
  elapsedSeconds: number;
  activeShells: number;
  activeParticles: number;
  launches: number;
  primaryBursts: number;
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
      launchEvents: [],
      primaryBurstEvents: [],
    },
    snapshot: {
      tick: 0,
      elapsedSeconds: 0,
      activeShells: 0,
      activeParticles: 0,
      launches: 0,
      primaryBursts: 0,
      nextLaunchInSeconds,
      sampledNoise: first,
    },
  };

  return state;
}

export function stepFireworksState({ previousState, config, deltaSeconds, isChannelActive }: StepFireworksStateInput): FireworksState {
  const sanitizedConfig = sanitizeFireworksConfig(config);
  const dt = clampFinite(deltaSeconds, 0, 5, 0);
  const currentTick = previousState.tick + 1;
  const currentElapsedSeconds = previousState.elapsedSeconds + dt;

  const nextShells: FireworkShellState[] = [];
  const primaryBurstEvents = [...previousState.telemetry.primaryBurstEvents];

  for (const shell of previousState.shells) {
    const nextVy = shell.vy - sanitizedConfig.shellGravity * dt;
    const nextAgeSeconds = shell.ageSeconds + dt;
    const nextAgeTicks = shell.ageTicks + 1;
    const nextY = Math.max(0, shell.y + nextVy * dt);
    const shouldBurst = nextVy <= 0 && nextAgeTicks >= shell.trailTicksRequired;

    if (shouldBurst) {
      primaryBurstEvents.push({
        shellId: shell.id,
        tick: currentTick,
        apexTick: currentTick,
        elapsedSeconds: currentElapsedSeconds,
        shellTicks: nextAgeTicks,
      });
      continue;
    }

    nextShells.push({
      ...shell,
      y: nextY,
      vy: nextVy,
      ageSeconds: nextAgeSeconds,
      ageTicks: nextAgeTicks,
    });
  }

  let launches = previousState.telemetry.launches;
  let nextLaunchInSeconds = Math.max(0, previousState.nextLaunchInSeconds - dt);
  let nextShellId = previousState.nextShellId;
  let nextRngCursor = previousState.rngCursor;
  const launchEvents = [...previousState.telemetry.launchEvents];

  if (isChannelActive && nextLaunchInSeconds <= 0) {
    const spawnNoise = sampleNoise(previousState.seed, nextRngCursor);
    const heightNoise = sampleNoise(previousState.seed, nextRngCursor + 1);
    const trailNoise = sampleNoise(previousState.seed, nextRngCursor + 2);
    const cooldownNoise = sampleNoise(previousState.seed, nextRngCursor + 3);
    nextRngCursor += 4;

    const shell = createShell({
      shellId: nextShellId,
      config: sanitizedConfig,
      spawnNoise,
      heightNoise,
      trailNoise,
    });

    launches += 1;
    nextShellId += 1;
    nextShells.push(shell);
    launchEvents.push({
      shellId: shell.id,
      tick: currentTick,
      elapsedSeconds: currentElapsedSeconds,
    });
    nextLaunchInSeconds = lerp(
      sanitizedConfig.launchIntervalMinSeconds,
      sanitizedConfig.launchIntervalMaxSeconds,
      cooldownNoise,
    );
  }

  const sampledNoise = sampleNoise(previousState.seed, nextRngCursor);

  const nextState: FireworksState = {
    seed: previousState.seed,
    rngCursor: nextRngCursor,
    tick: currentTick,
    elapsedSeconds: currentElapsedSeconds,
    nextLaunchInSeconds,
    nextShellId,
    shells: nextShells,
    particles: previousState.particles,
    telemetry: {
      ...previousState.telemetry,
      launches,
      primaryBursts: primaryBurstEvents.length,
      sampledNoise,
      launchEvents,
      primaryBurstEvents,
    },
    snapshot: {
      tick: currentTick,
      elapsedSeconds: currentElapsedSeconds,
      activeShells: nextShells.length,
      activeParticles: previousState.particles.length,
      launches,
      primaryBursts: primaryBurstEvents.length,
      nextLaunchInSeconds,
      sampledNoise,
    },
  };

  return nextState;
}

function createShell({
  shellId,
  config,
  spawnNoise,
  heightNoise,
  trailNoise,
}: {
  shellId: number;
  config: SanitizedFireworksConfig;
  spawnNoise: number;
  heightNoise: number;
  trailNoise: number;
}): FireworkShellState {
  const minArcSpeed = config.shellGravity * MIN_ARC_SECONDS;
  const maxArcSpeed = config.shellGravity * MAX_ARC_SECONDS;
  const speedMin = Math.max(config.shellSpeedMin, minArcSpeed);
  const speedMax = Math.min(config.shellSpeedMax, maxArcSpeed);
  const normalizedMin = Math.min(speedMin, speedMax);
  const normalizedMax = Math.max(speedMin, speedMax);

  return {
    id: `shell-${shellId}`,
    x: lerp(config.spawnXMin, config.spawnXMax, spawnNoise),
    y: 0,
    z: lerp(config.spawnZMin, config.spawnZMax, 1 - spawnNoise),
    vy: lerp(normalizedMin, normalizedMax, heightNoise),
    ageSeconds: 0,
    ageTicks: 0,
    trailTicksRequired: Math.max(
      MIN_PRE_BURST_TICKS,
      lerpInt(config.shellTrailTicksMin, config.shellTrailTicksMax, trailNoise),
    ),
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

function lerpInt(min: number, max: number, alpha: number): number {
  return Math.round(lerp(min, max, alpha));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
