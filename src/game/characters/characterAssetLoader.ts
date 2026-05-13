import { type AnimationClip } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { resolveAnimationClipsForTargets, type AnimationClipTargetBinding } from "./animationClipResolver";
import {
  buildCharacterViewFromGltf,
  selectLargestCharacterScene,
  type BuildCharacterViewOptions,
  type BuiltCharacterView,
  type LoadedCharacterScene,
} from "./modelPreparation";
import type { RemyAnimationAsset } from "./contracts";

const DRACO_DECODER_PATH = `${import.meta.env.BASE_URL}draco/`;

export interface GltfLoaderLike {
  loadAsync(url: string): Promise<LoadedCharacterScene>;
}

export interface GltfLoaderHandle {
  loader: GltfLoaderLike;
  dispose(): void;
}

export type GltfLoaderHandleFactory = () => GltfLoaderHandle;

export function createDracoGltfLoaderHandle(): GltfLoaderHandle {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  return {
    loader,
    dispose: () => {
      dracoLoader.dispose();
    },
  };
}

export async function loadCharacterViewFromAsset(
  modelUrl: string,
  options: BuildCharacterViewOptions,
  loaderFactory: GltfLoaderHandleFactory = createDracoGltfLoaderHandle,
): Promise<BuiltCharacterView | null> {
  const loaderHandle = loaderFactory();
  try {
    const gltf = await loaderHandle.loader.loadAsync(modelUrl);
    return buildCharacterViewFromGltf(gltf, options);
  } finally {
    loaderHandle.dispose();
  }
}

export async function loadResolvedAnimationClipsForTargets(
  targets: readonly AnimationClipTargetBinding[],
  animationCandidates: readonly RemyAnimationAsset[],
  loaderFactory: GltfLoaderHandleFactory = createDracoGltfLoaderHandle,
): Promise<readonly (AnimationClip | null)[] | null> {
  for (const animationCandidate of animationCandidates) {
    const loaderHandle = loaderFactory();
    try {
      const gltf = await loaderHandle.loader.loadAsync(animationCandidate.animationUrl);
      const animationSource = selectLargestCharacterScene(gltf.scenes) ?? gltf.scene;
      const resolvedClips = resolveAnimationClipsForTargets(targets, animationSource, gltf.animations);
      if (resolvedClips) {
        return resolvedClips;
      }
    } catch (error) {
      console.warn(`Failed to load animation clip ${animationCandidate.id}.`, error);
    } finally {
      loaderHandle.dispose();
    }
  }

  return null;
}
