import { Group } from "three";
import { describe, expect, it, vi } from "vitest";
import { createCharacterView } from "../../src/game/characters/characterView";
import {
  attachCharacterViewToPlacement,
  attachCharacterViewsToResolvedPlacement,
  buildCharacterLedgePlacementContext,
  buildCharacterTopFallbackPlacementContext,
  createCharacterSpatialAnchorContext,
  resolveCharacterLedgePlacement,
  resolveCharacterLedgePlacementFromMetadata,
  resolveCharacterTopFallbackPlacement,
  shouldUseDualCharacterLedgeMetadata,
  type CharacterPlacementTuning,
} from "../../src/game/characters/characterPlacementController";
import { createCharacterSceneNodes } from "../../src/game/characters/sceneNodes";

const PLACEMENT_TUNING: CharacterPlacementTuning = {
  targetHeightRatio: 0.42,
  minHeight: 0.54,
  maxHeight: 1.28,
  ledgeClearance: 0.03,
  ledgeInsetRatio: 0.14,
  wallClearance: 0.01,
  rotationOffsetY: 0.2,
};

describe("characterPlacementController", () => {
  it("builds ledge placement context from ledge metadata and tuning", () => {
    const context = buildCharacterLedgePlacementContext({
      slabLevel: 12,
      slabPosition: { x: 8, y: 20, z: -5 },
      slabHeight: 2,
      ledgePosition: { x: 1, y: 2, z: 3 },
      ledgeRotationY: Math.PI / 2,
      ledgeHeight: 0.2,
      ledgeDepth: 0.5,
      faceId: "posZ",
      usableWidth: 2,
      useDualCharacters: true,
      edgePadding: 0.04,
      spreadRatio: 0.22,
      minSpread: 0.08,
      placementTuning: PLACEMENT_TUNING,
    });

    expect(context).toMatchObject({
      level: 12,
      faceId: "posZ",
      slabPosition: { x: 8, y: 20, z: -5 },
      ledgePosition: { x: 1, y: 2, z: 3 },
      ledgeRotationY: Math.PI / 2,
      ledgeHeight: 0.2,
      ledgeDepth: 0.5,
      targetHeight: 0.84,
      sidePose: {
        pitchDegrees: 0,
        yawDegrees: 0,
        rollDegrees: 0,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
      },
    });
    expect(context.laneOffsets).toEqual([-0.44, 0.44]);
  });

  it("builds centered top-fallback placement context", () => {
    const context = buildCharacterTopFallbackPlacementContext({
      slabLevel: 4,
      slabPosition: { x: 0, y: 6, z: 0 },
      slabHeight: 1.5,
      placementTuning: PLACEMENT_TUNING,
    });

    expect(context).toEqual({
      level: 4,
      faceId: null,
      slabPosition: { x: 0, y: 6, z: 0 },
      ledgePosition: { x: 0, y: 0, z: 0 },
      ledgeRotationY: 0,
      ledgeHeight: 1.5,
      ledgeDepth: 0,
      laneOffsets: [0],
      targetHeight: 0.63,
      sidePose: {
        pitchDegrees: 0,
        yawDegrees: 0,
        rollDegrees: 0,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
      },
    });
  });

  it("resolves ledge placement defaults and dual-lane decision from raw anchor metadata", () => {
    const shouldUseDualCharacters = vi.fn().mockReturnValue(true);

    const result = resolveCharacterLedgePlacement({
      slabLevel: 9,
      slabPosition: { x: -3, y: 14, z: 2 },
      slabHeight: 2,
      ledgePosition: { x: 0.5, y: 1.25, z: -0.75 },
      ledgeRotationY: 0.6,
      ledgeHeight: null,
      ledgeDepth: null,
      faceId: "negZ",
      usableWidth: 1.2,
      widthRatio: null,
      edgePadding: 0.04,
      spreadRatio: 0.22,
      minSpread: 0.08,
      placementTuning: PLACEMENT_TUNING,
      shouldUseDualCharacters,
    });

    expect(shouldUseDualCharacters).toHaveBeenCalledWith(0);
    expect(result.useDualCharacters).toBe(true);
    expect(result.context).toMatchObject({
      level: 9,
      faceId: "negZ",
      slabPosition: { x: -3, y: 14, z: 2 },
      ledgePosition: { x: 0.5, y: 1.25, z: -0.75 },
      ledgeRotationY: 0.6,
      ledgeHeight: 0.2,
      ledgeDepth: 0.36,
      targetHeight: 0.84,
      sidePose: {
        pitchDegrees: 0,
        yawDegrees: 0,
        rollDegrees: 0,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
      },
    });
    expect(result.context.laneOffsets).toEqual([-0.264, 0.264]);
  });

  it("normalizes raw ledge metadata before resolving placement", () => {
    const shouldUseDualCharacters = vi.fn().mockReturnValue(true);

    const result = resolveCharacterLedgePlacementFromMetadata({
      slabLevel: 8,
      slabPosition: { x: 2, y: 12, z: -1 },
      slabHeight: 2,
      ledgePosition: { x: 0.25, y: 0.5, z: 0.75 },
      ledgeRotationY: 0.3,
      ledgeMetadata: {
        ledgeHeight: 0.33,
        ledgeDepth: 0.66,
        faceId: "negX",
        usableWidth: 1.8,
        widthRatio: 0.72,
      },
      edgePadding: 0.04,
      spreadRatio: 0.22,
      minSpread: 0.08,
      placementTuning: PLACEMENT_TUNING,
      shouldUseDualCharacters,
    });

    expect(shouldUseDualCharacters).toHaveBeenCalledWith(0.72);
    expect(result.useDualCharacters).toBe(true);
    expect(result.context).toMatchObject({
      level: 8,
      faceId: "negX",
      slabPosition: { x: 2, y: 12, z: -1 },
      ledgePosition: { x: 0.25, y: 0.5, z: 0.75 },
      ledgeRotationY: 0.3,
      ledgeHeight: 0.33,
      ledgeDepth: 0.66,
      targetHeight: 0.84,
    });
    expect(result.context.laneOffsets).toEqual([-0.396, 0.396]);
  });

  it("falls back when raw ledge metadata is missing numeric metrics", () => {
    const result = resolveCharacterLedgePlacementFromMetadata({
      slabLevel: 8,
      slabPosition: { x: 2, y: 12, z: -1 },
      slabHeight: 2,
      ledgePosition: { x: 0.25, y: 0.5, z: 0.75 },
      ledgeRotationY: 0.3,
      ledgeMetadata: {
        ledgeHeight: "bad",
        ledgeDepth: undefined,
        usableWidth: "wide",
        widthRatio: null,
      },
      edgePadding: 0.04,
      spreadRatio: 0.22,
      minSpread: 0.08,
      placementTuning: PLACEMENT_TUNING,
      shouldUseDualCharacters: () => true,
    });

    expect(result.context.faceId).toBeNull();
    expect(result.context.ledgeHeight).toBe(0.2);
    expect(result.context.ledgeDepth).toBe(0.36);
    expect(result.context.laneOffsets).toEqual([0]);
  });

  it("uses raw ledge metadata width ratio for secondary character decisions", () => {
    const shouldUseDualCharacters = vi.fn((widthRatio: number) => widthRatio > 0.5);

    expect(
      shouldUseDualCharacterLedgeMetadata({
        ledgeMetadata: { widthRatio: 0.72 },
        shouldUseDualCharacters,
      }),
    ).toBe(true);
    expect(shouldUseDualCharacters).toHaveBeenCalledWith(0.72);
  });

  it("falls back to single character when secondary decision metadata is absent", () => {
    const shouldUseDualCharacters = vi.fn(() => true);

    expect(
      shouldUseDualCharacterLedgeMetadata({
        ledgeMetadata: null,
        shouldUseDualCharacters,
      }),
    ).toBe(false);
    expect(shouldUseDualCharacters).not.toHaveBeenCalled();
  });

  it("falls back to zero width ratio for non-numeric secondary decision metadata", () => {
    const shouldUseDualCharacters = vi.fn((widthRatio: number) => widthRatio > 0);

    expect(
      shouldUseDualCharacterLedgeMetadata({
        ledgeMetadata: { widthRatio: "wide" },
        shouldUseDualCharacters,
      }),
    ).toBe(false);
    expect(shouldUseDualCharacters).toHaveBeenCalledWith(0);
  });

  it("resolves top-fallback placement context from raw slab metadata", () => {
    const result = resolveCharacterTopFallbackPlacement({
      slabLevel: 5,
      slabPosition: { x: -2, y: 7, z: 1 },
      slabHeight: 1.75,
      placementTuning: PLACEMENT_TUNING,
    });

    expect(result.context).toEqual({
      level: 5,
      faceId: null,
      slabPosition: { x: -2, y: 7, z: 1 },
      ledgePosition: { x: 0, y: 0, z: 0 },
      ledgeRotationY: 0,
      ledgeHeight: 1.75,
      ledgeDepth: 0,
      laneOffsets: [0],
      targetHeight: 0.735,
      sidePose: {
        pitchDegrees: 0,
        yawDegrees: 0,
        rollDegrees: 0,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
      },
    });
  });

  it("reuses explicit ledge metrics when resolving anchor placement context", () => {
    const result = resolveCharacterLedgePlacement({
      slabLevel: 6,
      slabPosition: { x: 1, y: 10, z: -4 },
      slabHeight: 3,
      ledgePosition: { x: 2, y: 3, z: 4 },
      ledgeRotationY: Math.PI / 4,
      ledgeHeight: 0.45,
      ledgeDepth: 0.9,
      faceId: "posX",
      usableWidth: 2,
      widthRatio: 0.7,
      edgePadding: 0.04,
      spreadRatio: 0.22,
      minSpread: 0.08,
      placementTuning: PLACEMENT_TUNING,
      shouldUseDualCharacters: () => false,
    });

    expect(result.useDualCharacters).toBe(false);
    expect(result.context.ledgeHeight).toBe(0.45);
    expect(result.context.ledgeDepth).toBe(0.9);
    expect(result.context.laneOffsets).toEqual([0]);
  });

  it("attaches a character view using the shared placement context", () => {
    const sceneNodes = createCharacterSceneNodes({
      model: new Group(),
      centerOffsetFromFeet: 0.5,
      nameSuffix: "primary",
    });
    const view = createCharacterView({
      sceneNodes,
      baseHeight: 2,
      baseDepth: 1,
    });
    const parent = new Group();
    const context = buildCharacterLedgePlacementContext({
      slabLevel: 2,
      slabPosition: { x: 0, y: 2, z: 0 },
      slabHeight: 2,
      ledgePosition: { x: 10, y: 5, z: -3 },
      ledgeRotationY: 0,
      ledgeHeight: 0.2,
      ledgeDepth: 0.5,
      faceId: "posZ",
      usableWidth: 0,
      useDualCharacters: false,
      edgePadding: 0.04,
      spreadRatio: 0.22,
      minSpread: 0.08,
      placementTuning: PLACEMENT_TUNING,
    });

    const placement = attachCharacterViewToPlacement({
      view,
      parent,
      context,
      laneOffset: context.laneOffsets[0] ?? 0,
      debugConfig: {
        yawDegrees: 5,
        pitchDegrees: -2,
        rollDegrees: 1,
        translateX: 0.3,
        translateY: 0.1,
        translateZ: -0.2,
      },
      placementTuning: PLACEMENT_TUNING,
    });

    expect(placement).not.toBeNull();
    expect(sceneNodes.characterRoot.parent).toBe(parent);
    expect(sceneNodes.placementNode.position.x).toBeCloseTo(10.3, 6);
    expect(sceneNodes.placementNode.position.y).toBeCloseTo(5.23, 6);
    expect(sceneNodes.placementNode.position.z).toBeCloseTo(-3.12, 6);
    expect(sceneNodes.facingNode.rotation.y).toBeCloseTo(0.2, 6);
    expect(sceneNodes.scaleNode.scale.x).toBeCloseTo(0.42, 6);
    expect(sceneNodes.poseRotateX.rotation.x).toBeCloseTo((-2 * Math.PI) / 180, 6);
    expect(sceneNodes.poseRotateY.rotation.y).toBeCloseTo((5 * Math.PI) / 180, 6);
    expect(sceneNodes.poseRotateZ.rotation.z).toBeCloseTo(Math.PI / 180, 6);
  });

  it("attaches primary and secondary views through the resolved placement helper", () => {
    const primaryNodes = createCharacterSceneNodes({
      model: new Group(),
      centerOffsetFromFeet: 0.5,
      nameSuffix: "primary",
    });
    const secondaryNodes = createCharacterSceneNodes({
      model: new Group(),
      centerOffsetFromFeet: 0.5,
      nameSuffix: "secondary",
    });
    const primaryView = createCharacterView({ sceneNodes: primaryNodes, baseHeight: 2, baseDepth: 1 });
    const secondaryView = createCharacterView({ sceneNodes: secondaryNodes, baseHeight: 2, baseDepth: 1 });
    const parent = new Group();
    const context = buildCharacterLedgePlacementContext({
      slabLevel: 2,
      slabPosition: { x: 0, y: 2, z: 0 },
      slabHeight: 2,
      ledgePosition: { x: 10, y: 5, z: -3 },
      ledgeRotationY: 0,
      ledgeHeight: 0.2,
      ledgeDepth: 0.5,
      faceId: "posZ",
      usableWidth: 2,
      useDualCharacters: true,
      edgePadding: 0.04,
      spreadRatio: 0.22,
      minSpread: 0.08,
      placementTuning: PLACEMENT_TUNING,
    });

    const placements = attachCharacterViewsToResolvedPlacement({
      primaryView,
      secondaryView,
      parent,
      context,
      useSecondary: true,
      primaryDebugConfig: {
        yawDegrees: 0,
        pitchDegrees: 0,
        rollDegrees: 0,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
      },
      secondaryDebugConfig: {
        yawDegrees: 0,
        pitchDegrees: 0,
        rollDegrees: 0,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
      },
      primaryPlacementTuning: PLACEMENT_TUNING,
      secondaryPlacementTuning: PLACEMENT_TUNING,
    });

    expect(placements[0]).not.toBeNull();
    expect(placements[1]).not.toBeNull();
    expect(primaryNodes.characterRoot.parent).toBe(parent);
    expect(secondaryNodes.characterRoot.parent).toBe(parent);
    expect(primaryNodes.placementNode.position.x).toBeCloseTo(9.56, 6);
    expect(secondaryNodes.placementNode.position.x).toBeCloseTo(10.44, 6);
  });

  it("keeps the primary centered while a requested secondary lane has no loaded secondary view", () => {
    const primaryNodes = createCharacterSceneNodes({
      model: new Group(),
      centerOffsetFromFeet: 0.5,
      nameSuffix: "primary",
    });
    const primaryView = createCharacterView({ sceneNodes: primaryNodes, baseHeight: 2, baseDepth: 1 });
    const parent = new Group();
    const context = buildCharacterLedgePlacementContext({
      slabLevel: 2,
      slabPosition: { x: 0, y: 2, z: 0 },
      slabHeight: 2,
      ledgePosition: { x: 10, y: 5, z: -3 },
      ledgeRotationY: 0,
      ledgeHeight: 0.2,
      ledgeDepth: 0.5,
      faceId: "posZ",
      usableWidth: 2,
      useDualCharacters: true,
      edgePadding: 0.04,
      spreadRatio: 0.22,
      minSpread: 0.08,
      placementTuning: PLACEMENT_TUNING,
    });

    const placements = attachCharacterViewsToResolvedPlacement({
      primaryView,
      secondaryView: null,
      parent,
      context,
      useSecondary: true,
      primaryDebugConfig: {
        yawDegrees: 0,
        pitchDegrees: 0,
        rollDegrees: 0,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
      },
      secondaryDebugConfig: {
        yawDegrees: 0,
        pitchDegrees: 0,
        rollDegrees: 0,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
      },
      primaryPlacementTuning: PLACEMENT_TUNING,
      secondaryPlacementTuning: PLACEMENT_TUNING,
    });

    expect(placements[0]).not.toBeNull();
    expect(placements[1]).toBeNull();
    expect(primaryNodes.characterRoot.parent).toBe(parent);
    expect(primaryNodes.placementNode.position.x).toBeCloseTo(10, 6);
    expect(primaryNodes.placementNode.position.z).toBeCloseTo(-2.92, 6);
  });

  it("detaches secondary view when resolved placement has no secondary lane", () => {
    const primaryNodes = createCharacterSceneNodes({
      model: new Group(),
      centerOffsetFromFeet: 0.5,
      nameSuffix: "primary",
    });
    const secondaryNodes = createCharacterSceneNodes({
      model: new Group(),
      centerOffsetFromFeet: 0.5,
      nameSuffix: "secondary",
    });
    const primaryView = createCharacterView({ sceneNodes: primaryNodes, baseHeight: 2, baseDepth: 1 });
    const secondaryView = createCharacterView({ sceneNodes: secondaryNodes, baseHeight: 2, baseDepth: 1 });
    const parent = new Group();
    const previousParent = new Group();
    previousParent.add(secondaryNodes.characterRoot);
    const context = buildCharacterTopFallbackPlacementContext({
      slabLevel: 4,
      slabPosition: { x: 0, y: 6, z: 0 },
      slabHeight: 1.5,
      placementTuning: PLACEMENT_TUNING,
    });

    const placements = attachCharacterViewsToResolvedPlacement({
      primaryView,
      secondaryView,
      parent,
      context,
      useSecondary: false,
      primaryDebugConfig: {
        yawDegrees: 0,
        pitchDegrees: 0,
        rollDegrees: 0,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
      },
      secondaryDebugConfig: {
        yawDegrees: 0,
        pitchDegrees: 0,
        rollDegrees: 0,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
      },
      primaryPlacementTuning: PLACEMENT_TUNING,
      secondaryPlacementTuning: PLACEMENT_TUNING,
    });

    expect(placements[0]).not.toBeNull();
    expect(placements[1]).toBeNull();
    expect(primaryNodes.characterRoot.parent).toBe(parent);
    expect(secondaryNodes.characterRoot.parent).toBeNull();
  });

  it("creates debug anchor context for the requested lane index", () => {
    const context = buildCharacterLedgePlacementContext({
      slabLevel: 7,
      slabPosition: { x: 2, y: 9, z: 4 },
      slabHeight: 2,
      ledgePosition: { x: 1, y: 2, z: 3 },
      ledgeRotationY: 0.4,
      ledgeHeight: 0.25,
      ledgeDepth: 0.6,
      faceId: "negX",
      usableWidth: 2,
      useDualCharacters: true,
      edgePadding: 0.04,
      spreadRatio: 0.22,
      minSpread: 0.08,
      placementTuning: PLACEMENT_TUNING,
    });

    expect(createCharacterSpatialAnchorContext(context, 1)).toEqual({
      level: 7,
      faceId: "negX",
      slabPosition: { x: 2, y: 9, z: 4 },
      ledgePosition: { x: 1, y: 2, z: 3 },
      ledgeRotationY: 0.4,
      ledgeHeight: 0.25,
      ledgeDepth: 0.6,
      usableWidth: null,
      widthRatio: null,
      laneOffset: 0.44,
      targetHeight: 0.84,
    });
  });

  it("reports a centered debug anchor when no secondary lane is active", () => {
    const context = buildCharacterLedgePlacementContext({
      slabLevel: 7,
      slabPosition: { x: 2, y: 9, z: 4 },
      slabHeight: 2,
      ledgePosition: { x: 1, y: 2, z: 3 },
      ledgeRotationY: 0.4,
      ledgeHeight: 0.25,
      ledgeDepth: 0.6,
      faceId: "negX",
      usableWidth: 2,
      useDualCharacters: true,
      edgePadding: 0.04,
      spreadRatio: 0.22,
      minSpread: 0.08,
      placementTuning: PLACEMENT_TUNING,
    });

    expect(createCharacterSpatialAnchorContext(context, 0, { useLaneOffset: false })?.laneOffset).toBe(0);
  });
});
