export type GameState = "idle" | "playing" | "game_over";

export type Axis = "x" | "z";

export interface Vector2Position {
  x: number;
  z: number;
}

export interface SlabDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface SlabData {
  level: number;
  axis: Axis;
  position: Vector2Position & { y: number };
  dimensions: SlabDimensions;
  direction: 1 | -1;
}

export interface TrimResult {
  outcome: "landed" | "perfect" | "miss";
  landedSlab: SlabData | null;
  debrisSlab: SlabData | null;
  overlap: number;
  trimmedSize: number;
}

export interface DebugConfig {
  cameraHeight: number;
  cameraDistance: number;
  cameraLerp: number;
  baseWidth: number;
  baseDepth: number;
  slabHeight: number;
  motionRange: number;
  motionSpeed: number;
  speedRamp: number;
  perfectTolerance: number;
  comboTarget: number;
  recoveryGrowthMultiplier: number;
  recoverySlowdownFactor: number;
  recoverySlowdownPlacements: number;
  feedbackAudioEnabled: boolean;
  feedbackHapticsEnabled: boolean;
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
  integrityPrecariousThreshold: number;
  integrityUnstableThreshold: number;
  integrityWobbleStrength: number;
  collapseDurationSeconds: number;
  collapseTiltStrength: number;
  collapseCameraPullback: number;
  collapseDropDistance: number;
  prebuiltLevels: number;
  debrisLifetime: number;
  debrisTumbleSpeed: number;
  gridVisible: boolean;
}

export interface TestModeOptions {
  enabled: boolean;
  startPaused: boolean;
  fixedStepSeconds: number;
  seed: number | null;
}

export interface PublicGameState {
  gameState: GameState;
  score: number;
  height: number;
  level: number;
  activeAxis: Axis | null;
  activePosition: { x: number; y: number; z: number } | null;
  lastPlacementOutcome: TrimResult["outcome"] | null;
  topDimensions: SlabDimensions | null;
  combo: {
    current: number;
    best: number;
    target: number;
    rewardReady: boolean;
  };
  recovery: {
    rewardsEarned: number;
    slowdownPlacementsRemaining: number;
    speedMultiplier: number;
  };
  feedback: {
    audioEnabled: boolean;
    hapticsEnabled: boolean;
    audioSupported: boolean;
    hapticsSupported: boolean;
    audioUnlocked: boolean;
    eventsTriggered: number;
    audioEventsPlayed: number;
    hapticEventsPlayed: number;
    lastEvent: "placement_perfect" | "placement_landed" | "placement_miss" | "collapse_failure" | null;
  };
  distractions: {
    enabled: boolean;
    level: number;
    active: {
      tentacle: boolean;
      gorilla: boolean;
      tremor: boolean;
      ufo: boolean;
      contrastWash: boolean;
      clouds: boolean;
    };
    signals: {
      tentacle: number;
      gorilla: number;
      tremor: number;
      ufo: number;
      contrastWash: number;
      clouds: number;
    };
    visuals: {
      gorillaOpacity: number;
      ufoOpacity: number;
      cloudOpacity: number;
      contrastOpacity: number;
      tremorStrength: number;
    };
  };
  integrity: {
    tier: "stable" | "precarious" | "unstable";
    normalizedOffset: number;
    wobbleStrength: number;
    centerOfMass: {
      x: number;
      z: number;
    };
    topCenter: {
      x: number;
      z: number;
    };
    offset: {
      x: number;
      z: number;
    };
  };
  collapse: {
    active: boolean;
    trigger: "miss" | "instability" | null;
    progress: number;
    cameraPullback: number;
    completed: boolean;
  };
  debugConfig: DebugConfig;
  testMode: {
    enabled: boolean;
    paused: boolean;
    fixedStepSeconds: number;
    seed: number | null;
  };
}

export interface TestApi {
  startGame(): void;
  stopActiveSlab(): void;
  restartGame(): void;
  returnToTitle(): void;
  applyDebugConfig(config: DebugConfig): void;
  stepSimulation(steps?: number): void;
  setPaused(paused: boolean): void;
  setActiveOffset(offset: number): boolean;
  placeAtOffset(offset: number): TrimResult["outcome"] | null;
  getState(): PublicGameState;
}
