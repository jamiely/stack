export interface RemyDebugConfig {
  yawDegrees: number;
  pitchDegrees: number;
  rollDegrees: number;
  translateX: number;
  translateY: number;
  translateZ: number;
}

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
