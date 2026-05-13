import { Group } from "three";
import { describe, expect, it } from "vitest";
import type { RemyPlacementTransformResult } from "../../src/game/characters/contracts";
import { createCharacterSceneNodes } from "../../src/game/characters/sceneNodes";
import { createCharacterView } from "../../src/game/characters/characterView";

function buildPlacement(overrides: Partial<RemyPlacementTransformResult> = {}): RemyPlacementTransformResult {
  return {
    uniformScale: 1.75,
    scaledDepth: 2.5,
    overlapIntoWall: 0.2,
    outwardOffset: 0.4,
    poseRotationDegrees: {
      x: 10,
      y: 20,
      z: 30,
    },
    worldPosition: {
      x: 4,
      y: 5,
      z: 6,
    },
    facingRotationY: 1.2,
    ...overrides,
  };
}

describe("createCharacterView", () => {
  it("applies placement transforms to the intended wrapper nodes only", () => {
    const sceneNodes = createCharacterSceneNodes({
      model: new Group(),
      centerOffsetFromFeet: 0.75,
      nameSuffix: "primary",
    });
    const view = createCharacterView({
      sceneNodes,
      baseHeight: 3,
      baseDepth: 2,
    });

    view.applyPlacement(buildPlacement());

    expect(sceneNodes.placementNode.position.toArray()).toEqual([4, 5, 6]);
    expect(sceneNodes.facingNode.rotation.y).toBeCloseTo(1.2, 6);
    expect(sceneNodes.scaleNode.scale.x).toBeCloseTo(1.75, 6);
    expect(sceneNodes.scaleNode.scale.y).toBeCloseTo(1.75, 6);
    expect(sceneNodes.scaleNode.scale.z).toBeCloseTo(1.75, 6);
    expect(sceneNodes.poseRotateX.rotation.x).toBeCloseTo(Math.PI / 18, 6);
    expect(sceneNodes.poseRotateY.rotation.y).toBeCloseTo(Math.PI / 9, 6);
    expect(sceneNodes.poseRotateZ.rotation.z).toBeCloseTo(Math.PI / 6, 6);

    expect(sceneNodes.characterRoot.position.length()).toBeCloseTo(0, 6);
    expect(sceneNodes.correctionNode.position.y).toBeCloseTo(0.75, 6);
  });

  it("centralizes attach/detach behavior on the character root", () => {
    const sceneNodes = createCharacterSceneNodes({
      model: new Group(),
      centerOffsetFromFeet: 0.5,
      nameSuffix: "secondary",
    });
    const view = createCharacterView({
      sceneNodes,
      baseHeight: 2,
      baseDepth: 1,
    });
    const parentA = new Group();
    const parentB = new Group();

    view.attachTo(parentA);
    expect(sceneNodes.characterRoot.parent).toBe(parentA);

    view.attachTo(parentB);
    expect(sceneNodes.characterRoot.parent).toBe(parentB);
    expect(parentA.children).toHaveLength(0);

    view.detach();
    expect(sceneNodes.characterRoot.parent).toBeNull();
  });

  it("exposes the wrapped animation target and base metrics", () => {
    const model = new Group();
    const sceneNodes = createCharacterSceneNodes({
      model,
      centerOffsetFromFeet: 1,
      nameSuffix: "primary",
    });
    const view = createCharacterView({
      sceneNodes,
      baseHeight: 4.5,
      baseDepth: 2.25,
    });

    expect(view.animationTarget).toBe(model);
    expect(view.baseHeight).toBeCloseTo(4.5, 6);
    expect(view.baseDepth).toBeCloseTo(2.25, 6);
  });
});
