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
