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
const MIN_PARTICLE_COUNT = 1;
const MAX_PARTICLE_COUNT = 120;
const MIN_RING_BIAS = 0;
const MAX_RING_BIAS = 1;
const MIN_RADIAL_JITTER = 0;
const MAX_RADIAL_JITTER = 1;
const MIN_VERTICAL_BIAS = -1;
const MAX_VERTICAL_BIAS = 1;
const MIN_SPEED_JITTER = 0;
const MAX_SPEED_JITTER = 1;
const MIN_TRAIL_TICKS = 1;
const MAX_TRAIL_TICKS = 240;
const MIN_ARC_SECONDS = 0.45;
const MAX_ARC_SECONDS = 1.1;
const MIN_PRE_BURST_TICKS = 6;
const MIN_SECONDARY_WINDOW_SECONDS = 0.05;
const MAX_SECONDARY_WINDOW_SECONDS = 0.35;
const MIN_PRIMARY_COMPLETION_SECONDS = 1.2;
const MAX_PRIMARY_COMPLETION_SECONDS = 2.2;
const MIN_SECONDARY_COMPLETION_SECONDS = 1;
const MAX_SECONDARY_COMPLETION_SECONDS = 2.8;
const MAX_CLEANUP_FROM_LAUNCH_SECONDS = 3.2;
const SECONDARY_TIMING_EPSILON_SECONDS = 1e-6;
const PRIMARY_PARTICLE_COUNT = 20;
const SECONDARY_PARTICLE_COUNT = 12;

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
  primaryParticleCount: number;
  secondaryParticleCount: number;
  ringBias: number;
  radialJitter: number;
  verticalBias: number;
  speedJitter: number;
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
  stage: "primary" | "secondary";
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  initialVy: number;
  ageSeconds: number;
  lifetimeSeconds: number;
  alpha: number;
}

export interface FireworkSecondaryEmissionState {
  shellId: string;
  x: number;
  y: number;
  z: number;
  ageSeconds: number;
  delaySeconds: number;
  primaryElapsedSeconds: number;
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

export interface FireworkSecondaryBurstEvent {
  shellId: string;
  tick: number;
  elapsedSeconds: number;
  delaySeconds: number;
}

export interface FireworkCompletionEvent {
  shellId: string;
  tick: number;
  elapsedSeconds: number;
}

export interface FireworkCleanupEvent {
  shellId: string;
  tick: number;
  elapsedSeconds: number;
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
  secondaryBurstEvents: FireworkSecondaryBurstEvent[];
  primaryCompletionEvents: FireworkCompletionEvent[];
  secondaryCompletionEvents: FireworkCompletionEvent[];
  cleanupEvents: FireworkCleanupEvent[];
}

export interface FireworksSnapshot {
  tick: number;
  elapsedSeconds: number;
  activeShells: number;
  activeParticles: number;
  launches: number;
  primaryBursts: number;
  secondaryBursts: number;
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
  nextParticleId: number;
  shells: FireworkShellState[];
  secondaryQueue: FireworkSecondaryEmissionState[];
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
  launchOriginX?: number;
  launchOriginY?: number;
  launchOriginZ?: number;
}

interface RngSample {
  value: number;
  cursor: number;
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
    primaryParticleCount: clampIntFinite(
      config.primaryParticleCount,
      MIN_PARTICLE_COUNT,
      MAX_PARTICLE_COUNT,
      PRIMARY_PARTICLE_COUNT,
    ),
    secondaryParticleCount: clampIntFinite(
      config.secondaryParticleCount,
      MIN_PARTICLE_COUNT,
      MAX_PARTICLE_COUNT,
      SECONDARY_PARTICLE_COUNT,
    ),
    ringBias: clampFinite(config.ringBias, MIN_RING_BIAS, MAX_RING_BIAS, 0),
    radialJitter: clampFinite(config.radialJitter, MIN_RADIAL_JITTER, MAX_RADIAL_JITTER, 0),
    verticalBias: clampFinite(config.verticalBias, MIN_VERTICAL_BIAS, MAX_VERTICAL_BIAS, 0),
    speedJitter: clampFinite(config.speedJitter, MIN_SPEED_JITTER, MAX_SPEED_JITTER, 0),
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
    nextParticleId: 0,
    shells: [],
    secondaryQueue: [],
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
      secondaryBurstEvents: [],
      primaryCompletionEvents: [],
      secondaryCompletionEvents: [],
      cleanupEvents: [],
    },
    snapshot: {
      tick: 0,
      elapsedSeconds: 0,
      activeShells: 0,
      activeParticles: 0,
      launches: 0,
      primaryBursts: 0,
      secondaryBursts: 0,
      nextLaunchInSeconds,
      sampledNoise: first,
    },
  };

  return state;
}

export function stepFireworksState({
  previousState,
  config,
  deltaSeconds,
  isChannelActive,
  launchOriginX,
  launchOriginY,
  launchOriginZ,
}: StepFireworksStateInput): FireworksState {
  const sanitizedConfig = sanitizeFireworksConfig(config);
  const dt = clampFinite(deltaSeconds, 0, 5, 0);
  const normalizedLaunchOriginX = clampFinite(launchOriginX ?? 0, -2_000, 2_000, 0);
  const normalizedLaunchOriginY = clampFinite(launchOriginY ?? 0, -1_000, 20_000, 0);
  const normalizedLaunchOriginZ = clampFinite(launchOriginZ ?? 0, -2_000, 2_000, 0);
  const currentTick = previousState.tick + 1;
  const currentElapsedSeconds = previousState.elapsedSeconds + dt;

  let nextRngCursor = previousState.rngCursor;
  let nextParticleId = previousState.nextParticleId;
  let droppedPrimary = previousState.telemetry.droppedPrimary;
  let droppedSecondary = previousState.telemetry.droppedSecondary;

  const launchEvents = [...previousState.telemetry.launchEvents];
  const primaryBurstEvents = [...previousState.telemetry.primaryBurstEvents];
  const secondaryBurstEvents = [...previousState.telemetry.secondaryBurstEvents];
  const primaryCompletionEvents = [...previousState.telemetry.primaryCompletionEvents];
  const secondaryCompletionEvents = [...previousState.telemetry.secondaryCompletionEvents];
  const cleanupEvents = [...previousState.telemetry.cleanupEvents];

  const launchByShell = new Map(launchEvents.map((event) => [event.shellId, event]));

  const nextShells: FireworkShellState[] = [];
  const burstOrigins: Array<{
    shellId: string;
    x: number;
    y: number;
    z: number;
    primaryElapsedSeconds: number;
    remainingStepSeconds: number;
  }> = [];

  for (const shell of previousState.shells) {
    const nextVy = shell.vy - sanitizedConfig.shellGravity * dt;
    const nextAgeSeconds = shell.ageSeconds + dt;
    const nextAgeTicks = shell.ageTicks + 1;
    const nextY = Math.max(0, shell.y + nextVy * dt);
    const shouldBurst = nextVy <= 0 && nextAgeTicks >= shell.trailTicksRequired;

    if (shouldBurst) {
      const burstOffsetSeconds = computeShellBurstOffsetSeconds({
        previousVy: shell.vy,
        gravity: sanitizedConfig.shellGravity,
        dt,
      });
      const burstElapsedSeconds = previousState.elapsedSeconds + burstOffsetSeconds;
      primaryBurstEvents.push({
        shellId: shell.id,
        tick: currentTick,
        apexTick: currentTick,
        elapsedSeconds: burstElapsedSeconds,
        shellTicks: nextAgeTicks,
      });
      burstOrigins.push({
        shellId: shell.id,
        x: shell.x,
        y: nextY,
        z: shell.z,
        primaryElapsedSeconds: burstElapsedSeconds,
        remainingStepSeconds: Math.max(0, dt - burstOffsetSeconds),
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

  if (isChannelActive && nextLaunchInSeconds <= 0) {
    const availableParticleRoom = Math.max(0, sanitizedConfig.maxActiveParticles - previousState.particles.length);
    const projectedPrimaryDemand = (nextShells.length + 1) * PRIMARY_PARTICLE_COUNT;

    if (availableParticleRoom >= projectedPrimaryDemand) {
      const spawnNoise = sampleNoise(previousState.seed, nextRngCursor);
      const depthNoise = sampleNoise(previousState.seed, nextRngCursor + 1);
      const heightNoise = sampleNoise(previousState.seed, nextRngCursor + 2);
      const trailNoise = sampleNoise(previousState.seed, nextRngCursor + 3);
      const cooldownNoise = sampleNoise(previousState.seed, nextRngCursor + 4);
      nextRngCursor += 5;

      const shell = createShell({
        shellId: nextShellId,
        config: sanitizedConfig,
        spawnNoise,
        depthNoise,
        heightNoise,
        trailNoise,
        launchOriginX: normalizedLaunchOriginX,
        launchOriginY: normalizedLaunchOriginY,
        launchOriginZ: normalizedLaunchOriginZ,
      });

      launches += 1;
      nextShellId += 1;
      nextShells.push(shell);
      launchEvents.push({
        shellId: shell.id,
        tick: currentTick,
        elapsedSeconds: currentElapsedSeconds,
      });
      launchByShell.set(shell.id, launchEvents[launchEvents.length - 1]!);
      nextLaunchInSeconds = lerp(
        sanitizedConfig.launchIntervalMinSeconds,
        sanitizedConfig.launchIntervalMaxSeconds,
        cooldownNoise,
      );
    } else {
      const cooldownSample = sampleWithCursor(previousState.seed, nextRngCursor);
      nextRngCursor = cooldownSample.cursor;
      nextLaunchInSeconds = lerp(
        sanitizedConfig.launchIntervalMinSeconds,
        sanitizedConfig.launchIntervalMaxSeconds,
        cooldownSample.value,
      );
    }
  }

  let nextSecondaryQueue = previousState.secondaryQueue.map((event) => ({ ...event, ageSeconds: event.ageSeconds + dt }));
  let nextParticles = [...previousState.particles];

  for (const origin of burstOrigins) {
    const reclaimedSecondary = reclaimSecondaryParticlesForPrimary({
      particles: nextParticles,
      maxActiveParticles: sanitizedConfig.maxActiveParticles,
      requiredPrimaryParticles: PRIMARY_PARTICLE_COUNT,
    });
    nextParticles = reclaimedSecondary.particles;
    droppedSecondary += reclaimedSecondary.droppedSecondary;

    const primaryEmit = emitBurstParticles({
      seed: previousState.seed,
      rngCursor: nextRngCursor,
      nextParticleId,
      shellId: origin.shellId,
      stage: "primary",
      x: origin.x,
      y: origin.y,
      z: origin.z,
      count: PRIMARY_PARTICLE_COUNT,
      lifetimeMin: Math.max(MIN_PRIMARY_COMPLETION_SECONDS, sanitizedConfig.particleLifetimeMinSeconds),
      lifetimeMax: Math.min(MAX_PRIMARY_COMPLETION_SECONDS, sanitizedConfig.particleLifetimeMaxSeconds),
      speedMin: 6,
      speedMax: 14,
      gravity: sanitizedConfig.shellGravity,
      drag: 0.94,
      activeParticles: nextParticles.length,
      maxActiveParticles: sanitizedConfig.maxActiveParticles,
    });
    nextRngCursor = primaryEmit.nextRngCursor;
    nextParticleId = primaryEmit.nextParticleId;
    nextParticles = nextParticles.concat(primaryEmit.particles);
    droppedPrimary += primaryEmit.dropped;

    const delaySample = sampleWithCursor(previousState.seed, nextRngCursor);
    nextRngCursor = delaySample.cursor;
    const secondaryDelayMin = Math.max(MIN_SECONDARY_WINDOW_SECONDS, sanitizedConfig.secondaryDelayMinSeconds);
    const secondaryDelayMax = Math.min(MAX_SECONDARY_WINDOW_SECONDS, sanitizedConfig.secondaryDelayMaxSeconds);
    const normalizedDelayMin = Math.min(secondaryDelayMin, secondaryDelayMax);
    const normalizedDelayMax = Math.max(secondaryDelayMin, secondaryDelayMax);

    nextSecondaryQueue.push({
      shellId: origin.shellId,
      x: origin.x,
      y: origin.y,
      z: origin.z,
      ageSeconds: origin.remainingStepSeconds,
      delaySeconds: lerp(normalizedDelayMin, normalizedDelayMax, delaySample.value),
      primaryElapsedSeconds: origin.primaryElapsedSeconds,
    });
  }

  const readySecondary: FireworkSecondaryEmissionState[] = [];
  const pendingSecondary: FireworkSecondaryEmissionState[] = [];
  for (const event of nextSecondaryQueue) {
    if (event.ageSeconds >= event.delaySeconds) {
      readySecondary.push(event);
      continue;
    }
    pendingSecondary.push(event);
  }
  nextSecondaryQueue = pendingSecondary;

  for (const event of readySecondary) {
    secondaryBurstEvents.push({
      shellId: event.shellId,
      tick: currentTick,
      elapsedSeconds: event.primaryElapsedSeconds + event.delaySeconds,
      delaySeconds: event.delaySeconds,
    });

    const secondaryEmit = emitBurstParticles({
      seed: previousState.seed,
      rngCursor: nextRngCursor,
      nextParticleId,
      shellId: event.shellId,
      stage: "secondary",
      x: event.x,
      y: event.y,
      z: event.z,
      count: SECONDARY_PARTICLE_COUNT,
      lifetimeMin: Math.max(MIN_SECONDARY_COMPLETION_SECONDS, sanitizedConfig.particleLifetimeMinSeconds),
      lifetimeMax: Math.min(MAX_SECONDARY_COMPLETION_SECONDS, sanitizedConfig.particleLifetimeMaxSeconds),
      speedMin: 4,
      speedMax: 10,
      gravity: sanitizedConfig.shellGravity * 1.45,
      drag: 0.9,
      activeParticles: nextParticles.length,
      maxActiveParticles: sanitizedConfig.maxActiveParticles,
    });

    nextRngCursor = secondaryEmit.nextRngCursor;
    nextParticleId = secondaryEmit.nextParticleId;
    nextParticles = nextParticles.concat(secondaryEmit.particles);
    droppedSecondary += secondaryEmit.dropped;
  }

  const previousPrimaryCounts = countParticlesByShell(previousState.particles, "primary");
  const previousSecondaryCounts = countParticlesByShell(previousState.particles, "secondary");

  const integratedParticles: FireworkParticleState[] = [];
  for (const particle of nextParticles) {
    const launchEvent = launchByShell.get(particle.shellId);
    const launchElapsed = launchEvent?.elapsedSeconds ?? currentElapsedSeconds;
    const fireworkAge = currentElapsedSeconds - launchElapsed;

    const updatedVy = particle.vy - sanitizedConfig.shellGravity * (particle.stage === "secondary" ? 1.45 : 1) * dt;
    const updatedVx = particle.vx * (particle.stage === "secondary" ? 0.9 : 0.94);
    const updatedVz = particle.vz * (particle.stage === "secondary" ? 0.9 : 0.94);
    const updatedAge = particle.ageSeconds + dt;
    const updatedAlpha = clamp(1 - updatedAge / particle.lifetimeSeconds, 0, 1);

    if (updatedAge >= particle.lifetimeSeconds || fireworkAge >= MAX_CLEANUP_FROM_LAUNCH_SECONDS) {
      continue;
    }

    integratedParticles.push({
      ...particle,
      x: particle.x + updatedVx * dt,
      y: particle.y + updatedVy * dt,
      z: particle.z + updatedVz * dt,
      vx: updatedVx,
      vy: updatedVy,
      vz: updatedVz,
      ageSeconds: updatedAge,
      alpha: updatedAlpha,
    });
  }

  const nextPrimaryCounts = countParticlesByShell(integratedParticles, "primary");
  const nextSecondaryCounts = countParticlesByShell(integratedParticles, "secondary");

  for (const [shellId, count] of previousPrimaryCounts) {
    if (count > 0 && (nextPrimaryCounts.get(shellId) ?? 0) === 0) {
      primaryCompletionEvents.push({ shellId, tick: currentTick, elapsedSeconds: currentElapsedSeconds });
    }
  }

  for (const [shellId, count] of previousSecondaryCounts) {
    if (count > 0 && (nextSecondaryCounts.get(shellId) ?? 0) === 0) {
      secondaryCompletionEvents.push({ shellId, tick: currentTick, elapsedSeconds: currentElapsedSeconds });
    }
  }

  const cleanupIds = new Set(cleanupEvents.map((event) => event.shellId));
  for (const launch of launchEvents) {
    if (cleanupIds.has(launch.shellId)) {
      continue;
    }

    const hasShell = nextShells.some((shell) => shell.id === launch.shellId);
    const hasSecondaryQueue = nextSecondaryQueue.some((event) => event.shellId === launch.shellId);
    const hasParticles = integratedParticles.some((particle) => particle.shellId === launch.shellId);
    const fireworkAge = currentElapsedSeconds - launch.elapsedSeconds;

    if (!hasShell && !hasSecondaryQueue && !hasParticles && fireworkAge >= 0) {
      cleanupEvents.push({ shellId: launch.shellId, tick: currentTick, elapsedSeconds: currentElapsedSeconds });
      cleanupIds.add(launch.shellId);
      continue;
    }

    if (fireworkAge >= MAX_CLEANUP_FROM_LAUNCH_SECONDS && !hasShell && !hasParticles && !hasSecondaryQueue) {
      cleanupEvents.push({ shellId: launch.shellId, tick: currentTick, elapsedSeconds: currentElapsedSeconds });
      cleanupIds.add(launch.shellId);
    }
  }

  nextSecondaryQueue = nextSecondaryQueue.filter((event) => {
    const launch = launchByShell.get(event.shellId);
    if (!launch) {
      return false;
    }
    return currentElapsedSeconds - launch.elapsedSeconds < MAX_CLEANUP_FROM_LAUNCH_SECONDS;
  });

  const sampledNoise = sampleNoise(previousState.seed, nextRngCursor);

  const nextState: FireworksState = {
    seed: previousState.seed,
    rngCursor: nextRngCursor,
    tick: currentTick,
    elapsedSeconds: currentElapsedSeconds,
    nextLaunchInSeconds,
    nextShellId,
    nextParticleId,
    shells: nextShells,
    secondaryQueue: nextSecondaryQueue,
    particles: integratedParticles,
    telemetry: {
      ...previousState.telemetry,
      launches,
      primaryBursts: primaryBurstEvents.length,
      secondaryBursts: secondaryBurstEvents.length,
      droppedSecondary,
      droppedPrimary,
      sampledNoise,
      launchEvents,
      primaryBurstEvents,
      secondaryBurstEvents,
      primaryCompletionEvents,
      secondaryCompletionEvents,
      cleanupEvents,
    },
    snapshot: {
      tick: currentTick,
      elapsedSeconds: currentElapsedSeconds,
      activeShells: nextShells.length,
      activeParticles: integratedParticles.length,
      launches,
      primaryBursts: primaryBurstEvents.length,
      secondaryBursts: secondaryBurstEvents.length,
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
  depthNoise,
  heightNoise,
  trailNoise,
  launchOriginX,
  launchOriginY,
  launchOriginZ,
}: {
  shellId: number;
  config: SanitizedFireworksConfig;
  spawnNoise: number;
  depthNoise: number;
  heightNoise: number;
  trailNoise: number;
  launchOriginX: number;
  launchOriginY: number;
  launchOriginZ: number;
}): FireworkShellState {
  const minArcSpeed = config.shellGravity * MIN_ARC_SECONDS;
  const maxArcSpeed = config.shellGravity * MAX_ARC_SECONDS;
  const speedMin = Math.max(config.shellSpeedMin, minArcSpeed);
  const speedMax = Math.min(config.shellSpeedMax, maxArcSpeed);
  const normalizedMin = Math.min(speedMin, speedMax);
  const normalizedMax = Math.max(speedMin, speedMax);

  const lateralNoise = shellId % 2 === 0 ? 0.5 + spawnNoise * 0.5 : spawnNoise * 0.5;

  return {
    id: `shell-${shellId}`,
    x: launchOriginX + lerp(config.spawnXMin, config.spawnXMax, lateralNoise),
    y: launchOriginY,
    z: launchOriginZ + lerp(config.spawnZMin, config.spawnZMax, depthNoise),
    vy: lerp(normalizedMin, normalizedMax, heightNoise),
    ageSeconds: 0,
    ageTicks: 0,
    trailTicksRequired: Math.max(
      MIN_PRE_BURST_TICKS,
      lerpInt(config.shellTrailTicksMin, config.shellTrailTicksMax, trailNoise),
    ),
  };
}

function reclaimSecondaryParticlesForPrimary({
  particles,
  maxActiveParticles,
  requiredPrimaryParticles,
}: {
  particles: FireworkParticleState[];
  maxActiveParticles: number;
  requiredPrimaryParticles: number;
}): { particles: FireworkParticleState[]; droppedSecondary: number } {
  const availableRoom = Math.max(0, maxActiveParticles - particles.length);
  const particlesNeeded = Math.max(0, requiredPrimaryParticles - availableRoom);
  if (particlesNeeded <= 0) {
    return {
      particles,
      droppedSecondary: 0,
    };
  }

  let remainingToDrop = particlesNeeded;
  const trimmed: FireworkParticleState[] = [];
  let droppedSecondary = 0;

  for (const particle of particles) {
    if (remainingToDrop > 0 && particle.stage === "secondary") {
      remainingToDrop -= 1;
      droppedSecondary += 1;
      continue;
    }

    trimmed.push(particle);
  }

  return {
    particles: trimmed,
    droppedSecondary,
  };
}

function emitBurstParticles({
  seed,
  rngCursor,
  nextParticleId,
  shellId,
  stage,
  x,
  y,
  z,
  count,
  lifetimeMin,
  lifetimeMax,
  speedMin,
  speedMax,
  gravity,
  drag,
  activeParticles,
  maxActiveParticles,
}: {
  seed: number;
  rngCursor: number;
  nextParticleId: number;
  shellId: string;
  stage: "primary" | "secondary";
  x: number;
  y: number;
  z: number;
  count: number;
  lifetimeMin: number;
  lifetimeMax: number;
  speedMin: number;
  speedMax: number;
  gravity: number;
  drag: number;
  activeParticles: number;
  maxActiveParticles: number;
}): {
  particles: FireworkParticleState[];
  nextRngCursor: number;
  nextParticleId: number;
  dropped: number;
} {
  const particles: FireworkParticleState[] = [];
  let cursor = rngCursor;
  let particleId = nextParticleId;
  const room = Math.max(0, maxActiveParticles - activeParticles);
  const emitCount = Math.min(count, room);

  for (let index = 0; index < emitCount; index += 1) {
    const azimuthSample = sampleWithCursor(seed, cursor);
    cursor = azimuthSample.cursor;
    const elevationSample = sampleWithCursor(seed, cursor);
    cursor = elevationSample.cursor;
    const speedSample = sampleWithCursor(seed, cursor);
    cursor = speedSample.cursor;
    const lifetimeSample = sampleWithCursor(seed, cursor);
    cursor = lifetimeSample.cursor;

    const azimuth = azimuthSample.value * Math.PI * 2;
    const elevation = (elevationSample.value - 0.5) * Math.PI;
    const speed = lerp(speedMin, speedMax, speedSample.value);

    const vx = Math.cos(azimuth) * Math.cos(elevation) * speed * drag;
    const vy = Math.sin(elevation) * speed - gravity * 0.12;
    const vz = Math.sin(azimuth) * Math.cos(elevation) * speed * drag;

    const normalizedLifetimeMin = Math.min(lifetimeMin, lifetimeMax);
    const normalizedLifetimeMax = Math.max(lifetimeMin, lifetimeMax);

    particles.push({
      id: `particle-${particleId}`,
      shellId,
      stage,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      initialVy: vy,
      ageSeconds: 0,
      lifetimeSeconds: lerp(normalizedLifetimeMin, normalizedLifetimeMax, lifetimeSample.value),
      alpha: 1,
    });

    particleId += 1;
  }

  return {
    particles,
    nextRngCursor: cursor,
    nextParticleId: particleId,
    dropped: Math.max(0, count - emitCount),
  };
}

function computeShellBurstOffsetSeconds({ previousVy, gravity, dt }: { previousVy: number; gravity: number; dt: number }): number {
  if (dt <= 0) {
    return 0;
  }

  if (previousVy <= 0) {
    if (dt <= MAX_SECONDARY_WINDOW_SECONDS) {
      return 0;
    }

    return Math.min(dt, dt - MAX_SECONDARY_WINDOW_SECONDS + SECONDARY_TIMING_EPSILON_SECONDS);
  }

  if (gravity <= 0) {
    return dt;
  }

  const rawOffset = clamp(previousVy / gravity, 0, dt);
  if (dt <= MAX_SECONDARY_WINDOW_SECONDS) {
    return rawOffset;
  }

  const latestAllowedOffset = Math.max(0, dt - MAX_SECONDARY_WINDOW_SECONDS + SECONDARY_TIMING_EPSILON_SECONDS);
  return Math.min(rawOffset, latestAllowedOffset);
}

function sampleWithCursor(seed: number, cursor: number): RngSample {
  return {
    value: sampleNoise(seed, cursor),
    cursor: cursor + 1,
  };
}

function countParticlesByShell(particles: FireworkParticleState[], stage: "primary" | "secondary"): Map<string, number> {
  const counts = new Map<string, number>();
  for (const particle of particles) {
    if (particle.stage !== stage) {
      continue;
    }

    counts.set(particle.shellId, (counts.get(particle.shellId) ?? 0) + 1);
  }

  return counts;
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
