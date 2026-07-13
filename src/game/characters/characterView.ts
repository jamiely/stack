import { Box3, Vector3, type Object3D } from "three";
import type { CharacterSceneNodes, CharacterView, RemyPlacementTransformResult } from "./contracts";

export interface CreateCharacterViewOptions {
  sceneNodes: CharacterSceneNodes;
  baseHeight: number;
  baseDepth: number;
}

class ThreeCharacterView implements CharacterView {
  private readonly animatedBounds = new Box3();
  private readonly correctionWorldScale = new Vector3();
  private readonly footWorldPosition = new Vector3();
  private readonly footNodes: Object3D[] = [];
  private readonly baseCorrectionY: number;
  private footToVisualBottomOffset: number | null = null;
  private groundTargetWorldY: number | null = null;

  public constructor(
    public readonly sceneNodes: CharacterSceneNodes,
    public readonly baseHeight: number,
    public readonly baseDepth: number,
  ) {
    this.baseCorrectionY = this.sceneNodes.correctionNode.position.y;
    this.animationTarget.traverse((node) => {
      if (/(?:left|right)(?:foot|toebase)$/i.test(node.name.replace(/[^a-z]/gi, ""))) {
        this.footNodes.push(node);
      }
    });
  }

  public get animationTarget(): Object3D {
    return this.sceneNodes.animationTarget;
  }

  public applyPlacement(placement: RemyPlacementTransformResult): void {
    this.footToVisualBottomOffset = null;
    this.groundTargetWorldY = null;
    this.sceneNodes.correctionNode.position.y = this.baseCorrectionY;
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

  public groundAnimatedPose(): boolean {
    if (!this.sceneNodes.characterRoot.parent) {
      return false;
    }

    this.sceneNodes.correctionNode.position.y = this.baseCorrectionY;
    this.sceneNodes.characterRoot.updateWorldMatrix(true, true);
    this.sceneNodes.correctionNode.getWorldScale(this.correctionWorldScale);
    const worldScaleY = Math.abs(this.correctionWorldScale.y);
    if (worldScaleY <= 0.000001) {
      return false;
    }

    let animatedBottomY: number;
    if (this.footNodes.length > 0) {
      const lowestFootY = this.footNodes.reduce((lowest, footNode) => {
        footNode.getWorldPosition(this.footWorldPosition);
        return Math.min(lowest, this.footWorldPosition.y);
      }, Number.POSITIVE_INFINITY);

      if (this.footToVisualBottomOffset === null || this.groundTargetWorldY === null) {
        this.animatedBounds.setFromObject(this.animationTarget, true);
        if (this.animatedBounds.isEmpty()) {
          return false;
        }
        this.groundTargetWorldY = this.animatedBounds.min.y;
        this.footToVisualBottomOffset = (this.animatedBounds.min.y - lowestFootY) / worldScaleY;
      }
      animatedBottomY = lowestFootY + this.footToVisualBottomOffset * worldScaleY;
    } else {
      this.animatedBounds.setFromObject(this.animationTarget, true);
      if (this.animatedBounds.isEmpty()) {
        return false;
      }
      this.groundTargetWorldY ??= this.animatedBounds.min.y;
      animatedBottomY = this.animatedBounds.min.y;
    }

    const worldCorrection = this.groundTargetWorldY - animatedBottomY;
    this.sceneNodes.correctionNode.position.y = this.baseCorrectionY + worldCorrection / worldScaleY;
    this.sceneNodes.characterRoot.updateWorldMatrix(true, true);
    return true;
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