import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from "three";
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

  it("grounds the current animated mesh pose back onto its placement height", () => {
    const model = new Group();
    model.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()));
    const sceneNodes = createCharacterSceneNodes({ model, centerOffsetFromFeet: 0.5, nameSuffix: "primary" });
    const view = createCharacterView({ sceneNodes, baseHeight: 1, baseDepth: 1 });
    const parent = new Group();
    view.attachTo(parent);
    view.applyPlacement(buildPlacement({
      uniformScale: 2,
      worldPosition: { x: 0, y: 3, z: 0 },
      poseRotationDegrees: { x: 0, y: 0, z: 0 },
    }));
    expect(view.groundAnimatedPose()).toBe(true);
    model.position.y = 0.4;
    expect(view.groundAnimatedPose()).toBe(true);
    expect(sceneNodes.correctionNode.position.y).toBeCloseTo(0.1, 6);
  });

  it("uses cached foot anchors to follow animated foot lift after initial visual calibration", () => {
    const model = new Group();
    model.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()));
    const foot = new Group();
    foot.name = "mixamorig:LeftFoot";
    foot.position.y = -0.5;
    model.add(foot);
    const sceneNodes = createCharacterSceneNodes({ model, centerOffsetFromFeet: 0.5, nameSuffix: "primary" });
    const view = createCharacterView({ sceneNodes, baseHeight: 1, baseDepth: 1 });
    view.attachTo(new Group());
    view.applyPlacement(buildPlacement({
      uniformScale: 2,
      worldPosition: { x: 0, y: 3, z: 0 },
      poseRotationDegrees: { x: 0, y: 0, z: 0 },
    }));

    expect(view.groundAnimatedPose()).toBe(true);
    foot.position.y += 0.2;
    expect(view.groundAnimatedPose()).toBe(true);
    expect(sceneNodes.correctionNode.position.y).toBeCloseTo(0.3, 6);
  });
});
