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

export interface ResolveCharacterLedgePlacementOptions {
  slabLevel: number;
  slabPosition: RemyVector3Like;
  slabHeight: number;
  ledgePosition: RemyVector3Like;
  ledgeRotationY: number;
  ledgeHeight: number | null;
  ledgeDepth: number | null;
  faceId: CharacterFaceId | null;
  usableWidth: number | null;
  widthRatio: number | null;
  edgePadding: number;
  spreadRatio: number;
  minSpread: number;
  placementTuning: CharacterPlacementTuning;
  shouldUseDualCharacters?: (widthRatio: number) => boolean;
}

export interface ResolvedCharacterLedgePlacement {
  context: CharacterPlacementContext;
  useDualCharacters: boolean;
}

export interface ResolveCharacterTopFallbackPlacementOptions {
  slabLevel: number;
  slabPosition: RemyVector3Like;
  slabHeight: number;
  placementTuning: CharacterPlacementTuning;
}

export interface ResolvedCharacterTopFallbackPlacement {
  context: CharacterPlacementContext;
}

export interface AttachCharacterViewToPlacementOptions {
  view: CharacterView | null;
  parent: Object3D;
  context: CharacterPlacementContext;
  laneOffset: number;
  debugConfig: RemyDebugConfig;
  placementTuning: CharacterPlacementTuning;
}

export interface AttachCharacterViewsToResolvedPlacementOptions {
  primaryView: CharacterView | null;
  secondaryView: CharacterView | null;
  parent: Object3D;
  context: CharacterPlacementContext;
  useSecondary: boolean;
  primaryDebugConfig: RemyDebugConfig;
  secondaryDebugConfig: RemyDebugConfig;
  primaryPlacementTuning: CharacterPlacementTuning;
  secondaryPlacementTuning: CharacterPlacementTuning;
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

export function resolveCharacterLedgePlacement(
  options: ResolveCharacterLedgePlacementOptions,
): ResolvedCharacterLedgePlacement {
  const widthRatio = options.widthRatio ?? 0;
  const useDualCharacters = (options.shouldUseDualCharacters ?? ((candidateWidthRatio) => candidateWidthRatio > 0))(widthRatio);

  return {
    context: buildCharacterLedgePlacementContext({
      slabLevel: options.slabLevel,
      slabPosition: options.slabPosition,
      slabHeight: options.slabHeight,
      ledgePosition: options.ledgePosition,
      ledgeRotationY: options.ledgeRotationY,
      ledgeHeight: options.ledgeHeight ?? Math.max(0.1, options.slabHeight * 0.1),
      ledgeDepth: options.ledgeDepth ?? Math.max(0.24, options.slabHeight * 0.18),
      faceId: options.faceId,
      usableWidth: options.usableWidth ?? 0,
      useDualCharacters,
      edgePadding: options.edgePadding,
      spreadRatio: options.spreadRatio,
      minSpread: options.minSpread,
      placementTuning: options.placementTuning,
    }),
    useDualCharacters,
  };
}

export function resolveCharacterTopFallbackPlacement(
  options: ResolveCharacterTopFallbackPlacementOptions,
): ResolvedCharacterTopFallbackPlacement {
  return {
    context: buildCharacterTopFallbackPlacementContext({
      slabLevel: options.slabLevel,
      slabPosition: options.slabPosition,
      slabHeight: options.slabHeight,
      placementTuning: options.placementTuning,
    }),
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

export function attachCharacterViewsToResolvedPlacement(
  options: AttachCharacterViewsToResolvedPlacementOptions,
): readonly (RemyPlacementTransformResult | null)[] {
  const primaryPlacement = attachCharacterViewToPlacement({
    view: options.primaryView,
    parent: options.parent,
    context: options.context,
    laneOffset: options.context.laneOffsets[0] ?? 0,
    debugConfig: options.primaryDebugConfig,
    placementTuning: options.primaryPlacementTuning,
  });

  if (!options.useSecondary || !options.secondaryView || options.context.laneOffsets.length < 2) {
    options.secondaryView?.detach();
    return [primaryPlacement, null];
  }

  const secondaryPlacement = attachCharacterViewToPlacement({
    view: options.secondaryView,
    parent: options.parent,
    context: options.context,
    laneOffset: options.context.laneOffsets[1]!,
    debugConfig: options.secondaryDebugConfig,
    placementTuning: options.secondaryPlacementTuning,
  });

  return [primaryPlacement, secondaryPlacement];
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
