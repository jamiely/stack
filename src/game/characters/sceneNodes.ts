import { Group } from "three";
import type { CharacterSceneNodes } from "./contracts";

export interface CreateCharacterSceneNodesOptions {
  model: import("three").Object3D;
  centerOffsetFromFeet: number;
  modelOffsetX?: number;
  nameSuffix: string;
}

export function createCharacterSceneNodes({
  model,
  centerOffsetFromFeet,
  modelOffsetX = 0,
  nameSuffix,
}: CreateCharacterSceneNodesOptions): CharacterSceneNodes {
  const characterRoot = new Group();
  characterRoot.name = `remy-character-${nameSuffix}`;

  const placementNode = new Group();
  placementNode.name = `remy-placement-${nameSuffix}`;

  const facingNode = new Group();
  facingNode.name = `remy-facing-${nameSuffix}`;

  const scaleNode = new Group();
  scaleNode.name = `remy-scale-${nameSuffix}`;

  const correctionNode = new Group();
  correctionNode.name = `remy-correction-${nameSuffix}`;
  correctionNode.position.x = modelOffsetX;
  correctionNode.position.y = centerOffsetFromFeet;

  const poseRotateX = new Group();
  poseRotateX.name = `remy-pose-rotate-x-${nameSuffix}`;

  const poseRotateY = new Group();
  poseRotateY.name = `remy-pose-rotate-y-${nameSuffix}`;

  const poseRotateZ = new Group();
  poseRotateZ.name = `remy-pose-rotate-z-${nameSuffix}`;

  characterRoot.add(placementNode);
  placementNode.add(facingNode);
  facingNode.add(scaleNode);
  scaleNode.add(correctionNode);
  correctionNode.add(poseRotateX);
  poseRotateX.add(poseRotateY);
  poseRotateY.add(poseRotateZ);
  poseRotateZ.add(model);

  return {
    characterRoot,
    placementNode,
    facingNode,
    scaleNode,
    correctionNode,
    poseRotateX,
    poseRotateY,
    poseRotateZ,
    animationTarget: model,
  };
}
