export type RemyCharacterId = "remy" | "timmy" | "amy" | "aj";

export interface RemyDebugConfig {
  yawDegrees: number;
  pitchDegrees: number;
  rollDegrees: number;
  translateX: number;
  translateY: number;
  translateZ: number;
}

export type RemyDebugKey = keyof RemyDebugConfig;

export interface RemyVector3Like {
  x: number;
  y: number;
  z: number;
}

export interface RemyPlacementTransformInput {
  ledgePosition: RemyVector3Like;
  ledgeRotationY: number;
  ledgeHeight: number;
  ledgeDepth: number;
  laneOffset: number;
  baseHeight: number;
  baseDepth: number;
  targetHeight: number;
  sidePose: RemyDebugConfig;
  debugConfig: RemyDebugConfig;
  ledgeInsetRatio: number;
  wallClearance: number;
  ledgeClearance: number;
  rotationOffsetY: number;
}

export interface RemyPlacementTransformResult {
  uniformScale: number;
  scaledDepth: number;
  overlapIntoWall: number;
  outwardOffset: number;
  poseRotationDegrees: {
    x: number;
    y: number;
    z: number;
  };
  worldPosition: RemyVector3Like;
  facingRotationY: number;
}

export interface RemyCharacterAsset {
  id: RemyCharacterId;
  modelUrl: string;
}

export interface RemyAnimationAsset {
  id: string;
  animationUrl: string;
}

export interface RemyModelConfig {
  debugDefaults: RemyDebugConfig;
  preparation: {
    autoDetectUpAxis: boolean;
    rotationOffsetZ: number;
  };
  placement: {
    targetHeightRatio: number;
    minHeight: number;
    maxHeight: number;
    ledgeClearance: number;
    ledgeInsetRatio: number;
    wallClearance: number;
    rotationOffsetY: number;
  };
}

export interface RemyModelNormalizationMetrics {
  boundsCenter: RemyVector3Like;
  baseHeight: number;
  baseDepth: number;
  centerOffsetFromFeet: number;
}

export interface CharacterSceneNodes<Object3DLike = import("three").Object3D, GroupLike = import("three").Group> {
  characterRoot: GroupLike;
  placementNode: GroupLike;
  facingNode: GroupLike;
  scaleNode: GroupLike;
  correctionNode: GroupLike;
  poseRotateX: GroupLike;
  poseRotateY: GroupLike;
  poseRotateZ: GroupLike;
  animationTarget: Object3DLike;
}

export interface CharacterView<Object3DLike = import("three").Object3D, GroupLike = import("three").Group> {
  readonly sceneNodes: CharacterSceneNodes<Object3DLike, GroupLike>;
  readonly animationTarget: Object3DLike;
  readonly baseHeight: number;
  readonly baseDepth: number;
  applyPlacement(placement: RemyPlacementTransformResult): void;
  attachTo(parent: Object3DLike): void;
  detach(): void;
}
