import { Group } from "three";
import { describe, expect, it } from "vitest";
import { createCharacterView } from "../../src/game/characters/characterView";
import {
  attachCharacterViewToPlacement,
  buildCharacterLedgePlacementContext,
  buildCharacterTopFallbackPlacementContext,
  createCharacterSpatialAnchorContext,
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
        translateZ: 0.4,
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
    expect(sceneNodes.placementNode.position.z).toBeCloseTo(-2.72, 6);
    expect(sceneNodes.facingNode.rotation.y).toBeCloseTo(0.2, 6);
    expect(sceneNodes.scaleNode.scale.x).toBeCloseTo(0.42, 6);
    expect(sceneNodes.poseRotateX.rotation.x).toBeCloseTo((-2 * Math.PI) / 180, 6);
    expect(sceneNodes.poseRotateY.rotation.y).toBeCloseTo((5 * Math.PI) / 180, 6);
    expect(sceneNodes.poseRotateZ.rotation.z).toBeCloseTo(Math.PI / 180, 6);
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
      laneOffset: 0.44,
      targetHeight: 0.84,
    });
  });
});
