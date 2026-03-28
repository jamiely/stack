export type GameState = "idle" | "playing";

export type Axis = "x" | "z";

export interface DebugConfig {
  cameraHeight: number;
  cameraDistance: number;
  cameraLerp: number;
  motionRange: number;
  motionSpeed: number;
  gridVisible: boolean;
}
