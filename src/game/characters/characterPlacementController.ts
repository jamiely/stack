import type { Object3D } from "three";
import type {
  CharacterView,
  RemyDebugConfig,
  RemyModelConfig,
  RemyPlacementTransformResult,
  RemyVector3Like,
} from "./contracts";
import type { CharacterFaceId } from "./modelConfigs";
import { computeRemyPlacementTransform, resolveRemyTargetHeight } from "./placementMath";
import { resolveCharacterSidePose, resolveDualCharacterLaneOffsets } from "./placementRuntime";

export type CharacterPlacementTuning = RemyModelConfig["placement"];

export interface CharacterPlacementContext {
  level: number;
  faceId: CharacterFaceId | null;
  slabPosition: RemyVector3Like;
  ledgePosition: RemyVector3Like;
  ledgeRotationY: number;
  ledgeHeight: number;
  ledgeDepth: number;
  laneOffsets: readonly number[];
  targetHeight: number;
  sidePose: RemyDebugConfig;
}

export interface CharacterSpatialAnchorContext {
  level: number | null;
  faceId: CharacterFaceId | null;
  slabPosition: RemyVector3Like | null;
  ledgePosition: RemyVector3Like | null;
  ledgeRotationY: number | null;
  ledgeHeight: number | null;
  ledgeDepth: number | null;
  laneOffset: number | null;
  targetHeight: number | null;
}

export interface BuildCharacterLedgePlacementContextOptions {
  slabLevel: number;
  slabPosition: RemyVector3Like;
  slabHeight: number;
  ledgePosition: RemyVector3Like;
  ledgeRotationY: number;
  ledgeHeight: number;
  ledgeDepth: number;
  faceId: CharacterFaceId | null;
  usableWidth: number;
  useDualCharacters: boolean;
  edgePadding: number;
  spreadRatio: number;
  minSpread: number;
  placementTuning: CharacterPlacementTuning;
}

export interface BuildCharacterTopFallbackPlacementContextOptions {
  slabLevel: number;
  slabPosition: RemyVector3Like;
  slabHeight: number;
  placementTuning: CharacterPlacementTuning;
}

export interface AttachCharacterViewToPlacementOptions {
  view: CharacterView | null;
  parent: Object3D;
  context: CharacterPlacementContext;
  laneOffset: number;
  debugConfig: RemyDebugConfig;
  placementTuning: CharacterPlacementTuning;
}

export function buildCharacterLedgePlacementContext(
  options: BuildCharacterLedgePlacementContextOptions,
): CharacterPlacementContext {
  return {
    level: options.slabLevel,
    faceId: options.faceId,
    slabPosition: options.slabPosition,
    ledgePosition: options.ledgePosition,
    ledgeRotationY: options.ledgeRotationY,
    ledgeHeight: options.ledgeHeight,
    ledgeDepth: options.ledgeDepth,
    laneOffsets: resolveDualCharacterLaneOffsets({
      usableWidth: options.usableWidth,
      useDualCharacters: options.useDualCharacters,
      edgePadding: options.edgePadding,
      spreadRatio: options.spreadRatio,
      minSpread: options.minSpread,
    }),
    targetHeight: resolveRemyTargetHeight(
      options.slabHeight,
      options.placementTuning.targetHeightRatio,
      options.placementTuning.minHeight,
      options.placementTuning.maxHeight,
    ),
    sidePose: resolveCharacterSidePose(options.faceId),
  };
}

export function buildCharacterTopFallbackPlacementContext(
  options: BuildCharacterTopFallbackPlacementContextOptions,
): CharacterPlacementContext {
  return {
    level: options.slabLevel,
    faceId: null,
    slabPosition: options.slabPosition,
    ledgePosition: { x: 0, y: 0, z: 0 },
    ledgeRotationY: 0,
    ledgeHeight: options.slabHeight,
    ledgeDepth: 0,
    laneOffsets: [0],
    targetHeight: resolveRemyTargetHeight(
      options.slabHeight,
      options.placementTuning.targetHeightRatio,
      options.placementTuning.minHeight,
      options.placementTuning.maxHeight,
    ),
    sidePose: resolveCharacterSidePose(null),
  };
}

export function attachCharacterViewToPlacement(
  options: AttachCharacterViewToPlacementOptions,
): RemyPlacementTransformResult | null {
  if (!options.view) {
    return null;
  }

  const placement = computeRemyPlacementTransform({
    ledgePosition: options.context.ledgePosition,
    ledgeRotationY: options.context.ledgeRotationY,
    ledgeHeight: options.context.ledgeHeight,
    ledgeDepth: options.context.ledgeDepth,
    laneOffset: options.laneOffset,
    baseHeight: options.view.baseHeight,
    baseDepth: options.view.baseDepth,
    targetHeight: options.context.targetHeight,
    sidePose: options.context.sidePose,
    debugConfig: options.debugConfig,
    ledgeInsetRatio: options.placementTuning.ledgeInsetRatio,
    wallClearance: options.placementTuning.wallClearance,
    ledgeClearance: options.placementTuning.ledgeClearance,
    rotationOffsetY: options.placementTuning.rotationOffsetY,
  });

  options.view.applyPlacement(placement);
  options.view.attachTo(options.parent);
  return placement;
}

export function createCharacterSpatialAnchorContext(
  context: CharacterPlacementContext | null,
  laneIndex = 0,
): CharacterSpatialAnchorContext | null {
  if (!context) {
    return null;
  }

  return {
    level: context.level,
    faceId: context.faceId,
    slabPosition: context.slabPosition,
    ledgePosition: context.ledgePosition,
    ledgeRotationY: context.ledgeRotationY,
    ledgeHeight: context.ledgeHeight,
    ledgeDepth: context.ledgeDepth,
    laneOffset: context.laneOffsets[laneIndex] ?? 0,
    targetHeight: context.targetHeight,
  };
}
