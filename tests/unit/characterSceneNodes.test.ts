import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { createCharacterSceneNodes } from "../../src/game/characters/sceneNodes";

describe("createCharacterSceneNodes", () => {
  it("creates the full wrapper hierarchy in the expected order", () => {
    const model = new Mesh(new BoxGeometry(1, 2, 3), new MeshBasicMaterial());
    const sceneNodes = createCharacterSceneNodes({
      model,
      centerOffsetFromFeet: 1.25,
      nameSuffix: "primary",
    });

    expect(sceneNodes.characterRoot.children).toEqual([sceneNodes.placementNode]);
    expect(sceneNodes.placementNode.children).toEqual([sceneNodes.facingNode]);
    expect(sceneNodes.facingNode.children).toEqual([sceneNodes.scaleNode]);
    expect(sceneNodes.scaleNode.children).toEqual([sceneNodes.correctionNode]);
    expect(sceneNodes.correctionNode.children).toEqual([sceneNodes.poseRotateX]);
    expect(sceneNodes.poseRotateX.children).toEqual([sceneNodes.poseRotateY]);
    expect(sceneNodes.poseRotateY.children).toEqual([sceneNodes.poseRotateZ]);
    expect(sceneNodes.poseRotateZ.children).toEqual([model]);
    expect(sceneNodes.animationTarget).toBe(model);
    expect(sceneNodes.correctionNode.position.y).toBeCloseTo(1.25, 6);
  });

  it("keeps the normalized model bounds centered after wrapping", () => {
    const model = new Mesh(new BoxGeometry(2, 4, 2), new MeshBasicMaterial());
    const sceneNodes = createCharacterSceneNodes({
      model,
      centerOffsetFromFeet: 2,
      nameSuffix: "primary",
    });

    const bounds = new Box3().setFromObject(sceneNodes.characterRoot);
    const center = bounds.getCenter(new Vector3());

    expect(center.x).toBeCloseTo(0, 6);
    expect(center.z).toBeCloseTo(0, 6);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(bounds.max.y).toBeCloseTo(4, 6);
  });

  it("can be attached through the top-level root without reparenting inner nodes", () => {
    const model = new Group();
    const sceneNodes = createCharacterSceneNodes({
      model,
      centerOffsetFromFeet: 0.5,
      nameSuffix: "secondary",
    });
    const parent = new Group();

    parent.add(sceneNodes.characterRoot);

    expect(sceneNodes.characterRoot.parent).toBe(parent);
    expect(sceneNodes.placementNode.parent).toBe(sceneNodes.characterRoot);
    expect(sceneNodes.poseRotateZ.parent).toBe(sceneNodes.poseRotateY);
  });
});
