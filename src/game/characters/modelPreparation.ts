import { Box3, Mesh, Object3D, Vector3, type AnimationClip } from "three";
import { createCharacterView } from "./characterView";
import { normalizeRemyModel } from "./modelNormalization";
import { createCharacterSceneNodes } from "./sceneNodes";
import type { CharacterView, RemyCharacterId } from "./contracts";

export interface LoadedCharacterScene {
  scene: Object3D;
  scenes: readonly Object3D[];
  animations: readonly AnimationClip[];
}

export interface BuildCharacterViewOptions {
  characterId: RemyCharacterId;
  nameSuffix: string;
  autoDetectUpAxis?: boolean;
  rotationOffsetZ?: number;
}

export interface BuiltCharacterView {
  view: CharacterView;
  animations: readonly AnimationClip[];
}

export function selectLargestCharacterScene(scenes: readonly Object3D[]): Object3D | null {
  let selectedScene: Object3D | null = null;
  let selectedScore = -1;

  scenes.forEach((sceneCandidate) => {
    const bounds = new Box3().setFromObject(sceneCandidate);
    const size = bounds.getSize(new Vector3());
    if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
      return;
    }

    const score = size.x * size.y * size.z;
    if (score > selectedScore) {
      selectedScene = sceneCandidate;
      selectedScore = score;
    }
  });

  return selectedScene;
}

export function applyBestCharacterUpAxisRotation(model: Object3D): void {
  const candidateRotations = [
    { x: 0, y: 0, z: 0 },
    { x: -Math.PI / 2, y: 0, z: 0 },
    { x: Math.PI / 2, y: 0, z: 0 },
    { x: 0, y: 0, z: -Math.PI / 2 },
    { x: 0, y: 0, z: Math.PI / 2 },
  ];

  let bestRotation = candidateRotations[0]!;
  let bestHeight = Number.NEGATIVE_INFINITY;

  candidateRotations.forEach((rotation) => {
    model.rotation.set(rotation.x, rotation.y, rotation.z);
    model.updateMatrixWorld(true);
    const size = new Box3().setFromObject(model).getSize(new Vector3());
    if (size.y > bestHeight) {
      bestHeight = size.y;
      bestRotation = rotation;
    }
  });

  model.rotation.set(bestRotation.x, bestRotation.y, bestRotation.z);
  model.updateMatrixWorld(true);
}

export function prepareCharacterModelForRendering(model: Object3D): void {
  model.traverse((node) => {
    if (node instanceof Mesh) {
      node.frustumCulled = false;
    }
  });
}

export function buildCharacterViewFromGltf(
  gltf: LoadedCharacterScene,
  options: BuildCharacterViewOptions,
): BuiltCharacterView | null {
  const model = selectLargestCharacterScene(gltf.scenes) ?? gltf.scene;
  if (options.autoDetectUpAxis) {
    applyBestCharacterUpAxisRotation(model);
  }

  model.rotation.z += options.rotationOffsetZ ?? 0;
  model.updateMatrixWorld(true);
  prepareCharacterModelForRendering(model);

  const normalizedMetrics = normalizeRemyModel(model);
  if (!normalizedMetrics) {
    console.warn(`Unable to place character ${options.characterId}; model bounds height is invalid.`);
    return null;
  }

  return {
    view: createCharacterView({
      sceneNodes: createCharacterSceneNodes({
        model,
        centerOffsetFromFeet: normalizedMetrics.centerOffsetFromFeet,
        nameSuffix: options.nameSuffix,
      }),
      baseHeight: normalizedMetrics.baseHeight,
      baseDepth: normalizedMetrics.baseDepth,
    }),
    animations: gltf.animations,
  };
}
