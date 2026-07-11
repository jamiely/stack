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
  usableWidth: number;
  laneEdgePadding: number;
  laneSpreadRatio: number;
  laneMinSpread: number;
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
  usableWidth: number | null;
  widthRatio: number | null;
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

export interface CharacterLedgePlacementMetadata {
  ledgeHeight?: unknown;
  ledgeDepth?: unknown;
  faceId?: CharacterFaceId | null;
  usableWidth?: unknown;
  widthRatio?: unknown;
}

export interface ResolveCharacterLedgePlacementFromMetadataOptions {
  slabLevel: number;
  slabPosition: RemyVector3Like;
  slabHeight: number;
  ledgePosition: RemyVector3Like;
  ledgeRotationY: number;
  ledgeMetadata: CharacterLedgePlacementMetadata;
  edgePadding: number;
  spreadRatio: number;
  minSpread: number;
  placementTuning: CharacterPlacementTuning;
  shouldUseDualCharacters?: (widthRatio: number) => boolean;
}

export interface ShouldUseDualCharacterLedgeMetadataOptions {
  ledgeMetadata: CharacterLedgePlacementMetadata | null;
  shouldUseDualCharacters: (widthRatio: number) => boolean;
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
    usableWidth: options.usableWidth,
    laneEdgePadding: options.edgePadding,
    laneSpreadRatio: options.spreadRatio,
    laneMinSpread: options.minSpread,
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
    usableWidth: 0,
    laneEdgePadding: 0,
    laneSpreadRatio: 0,
    laneMinSpread: 0,
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

export function resolveCharacterLedgePlacementFromMetadata(
  options: ResolveCharacterLedgePlacementFromMetadataOptions,
): ResolvedCharacterLedgePlacement {
  return resolveCharacterLedgePlacement({
    slabLevel: options.slabLevel,
    slabPosition: options.slabPosition,
    slabHeight: options.slabHeight,
    ledgePosition: options.ledgePosition,
    ledgeRotationY: options.ledgeRotationY,
    ledgeHeight: typeof options.ledgeMetadata.ledgeHeight === "number" ? options.ledgeMetadata.ledgeHeight : null,
    ledgeDepth: typeof options.ledgeMetadata.ledgeDepth === "number" ? options.ledgeMetadata.ledgeDepth : null,
    faceId: options.ledgeMetadata.faceId ?? null,
    usableWidth: typeof options.ledgeMetadata.usableWidth === "number" ? options.ledgeMetadata.usableWidth : null,
    widthRatio: typeof options.ledgeMetadata.widthRatio === "number" ? options.ledgeMetadata.widthRatio : null,
    edgePadding: options.edgePadding,
    spreadRatio: options.spreadRatio,
    minSpread: options.minSpread,
    placementTuning: options.placementTuning,
    shouldUseDualCharacters: options.shouldUseDualCharacters,
  });
}

export function shouldUseDualCharacterLedgeMetadata(options: ShouldUseDualCharacterLedgeMetadataOptions): boolean {
  if (!options.ledgeMetadata) {
    return false;
  }

  const widthRatio = typeof options.ledgeMetadata.widthRatio === "number" ? options.ledgeMetadata.widthRatio : 0;
  return options.shouldUseDualCharacters(widthRatio);
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
  const characterHalfWidths = [options.primaryView, options.secondaryView].map((view) =>
    view ? (view.baseDepth * options.context.targetHeight) / Math.max(0.001, view.baseHeight) / 2 : 0,
  );
  const supportedLaneOffsets = resolveDualCharacterLaneOffsets({
    usableWidth: options.context.usableWidth,
    useDualCharacters: options.useSecondary && Boolean(options.secondaryView),
    edgePadding: options.context.laneEdgePadding,
    spreadRatio: options.context.laneSpreadRatio,
    minSpread: options.context.laneMinSpread,
    characterHalfWidths,
  });
  const shouldUseSecondaryLane = supportedLaneOffsets.length >= 2;
  const primaryPlacement = attachCharacterViewToPlacement({
    view: options.primaryView,
    parent: options.parent,
    context: options.context,
    laneOffset: shouldUseSecondaryLane ? (supportedLaneOffsets[0] ?? 0) : 0,
    debugConfig: options.primaryDebugConfig,
    placementTuning: options.primaryPlacementTuning,
  });

  if (!shouldUseSecondaryLane || !options.secondaryView) {
    options.secondaryView?.detach();
    return [primaryPlacement, null];
  }

  const secondaryPlacement = attachCharacterViewToPlacement({
    view: options.secondaryView,
    parent: options.parent,
    context: options.context,
    laneOffset: supportedLaneOffsets[1]!,
    debugConfig: options.secondaryDebugConfig,
    placementTuning: options.secondaryPlacementTuning,
  });

  return [primaryPlacement, secondaryPlacement];
}

export function createCharacterSpatialAnchorContext(
  context: CharacterPlacementContext | null,
  laneIndex = 0,
  options: { useLaneOffset?: boolean; usableWidth?: number | null; widthRatio?: number | null } = {},
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
    usableWidth: options.usableWidth ?? null,
    widthRatio: options.widthRatio ?? null,
    laneOffset: options.useLaneOffset === false ? 0 : (context.laneOffsets[laneIndex] ?? 0),
    targetHeight: context.targetHeight,
  };
}
