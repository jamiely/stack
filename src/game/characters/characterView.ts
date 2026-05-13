import type { Object3D } from "three";
import type { CharacterSceneNodes, CharacterView, RemyPlacementTransformResult } from "./contracts";

export interface CreateCharacterViewOptions {
  sceneNodes: CharacterSceneNodes;
  baseHeight: number;
  baseDepth: number;
}

class ThreeCharacterView implements CharacterView {
  public constructor(
    public readonly sceneNodes: CharacterSceneNodes,
    public readonly baseHeight: number,
    public readonly baseDepth: number,
  ) {}

  public get animationTarget(): Object3D {
    return this.sceneNodes.animationTarget;
  }

  public applyPlacement(placement: RemyPlacementTransformResult): void {
    this.sceneNodes.placementNode.position.set(
      placement.worldPosition.x,
      placement.worldPosition.y,
      placement.worldPosition.z,
    );
    this.sceneNodes.facingNode.rotation.set(0, placement.facingRotationY, 0);
    this.sceneNodes.scaleNode.scale.setScalar(placement.uniformScale);
    this.sceneNodes.poseRotateX.rotation.set(toRadians(placement.poseRotationDegrees.x), 0, 0);
    this.sceneNodes.poseRotateY.rotation.set(0, toRadians(placement.poseRotationDegrees.y), 0);
    this.sceneNodes.poseRotateZ.rotation.set(0, 0, toRadians(placement.poseRotationDegrees.z));
  }

  public attachTo(parent: Object3D): void {
    parent.add(this.sceneNodes.characterRoot);
  }

  public detach(): void {
    this.sceneNodes.characterRoot.parent?.remove(this.sceneNodes.characterRoot);
  }
}

export function createCharacterView({ sceneNodes, baseHeight, baseDepth }: CreateCharacterViewOptions): CharacterView {
  return new ThreeCharacterView(sceneNodes, baseHeight, baseDepth);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}