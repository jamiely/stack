import {
  Box3,
  Group,
  Mesh,
  type Material,
  type Object3D,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const UFO_MODEL_URL = new URL("../../../assets/flying_saucer_a.glb", import.meta.url).href;

const UFO_WORLD_WIDTH_TO_SLAB_HEIGHT_RATIO = 1.35;
const UFO_MIN_WORLD_WIDTH = 2.5;
const UFO_MAX_WORLD_WIDTH = 4.2;

interface UfoGltf {
  scene: Group;
}

export interface UfoGltfLoaderLike {
  loadAsync(url: string): Promise<UfoGltf>;
}

type OpacityMaterial = Material & {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  userData: Record<string, unknown>;
};

export function resolveUfoModelWidth(slabHeight: number, viewportAspect = 1): number {
  const desktopWidth = Math.min(UFO_MAX_WORLD_WIDTH, Math.max(UFO_MIN_WORLD_WIDTH, slabHeight * UFO_WORLD_WIDTH_TO_SLAB_HEIGHT_RATIO));
  const responsiveScale = viewportAspect <= 0.75 ? 0.72 : 1;
  return Math.max(UFO_MIN_WORLD_WIDTH, desktopWidth * responsiveScale);
}

export function resolveUfoOrbitRadius(baseWidth: number, signal: number): number {
  const clampedSignal = Math.min(1, Math.max(0, signal));
  return Math.max(3.2, baseWidth * 0.78 + clampedSignal * 0.9);
}

export function normalizeUfoModel(source: Group, targetWidth: number): Group {
  const sourceBounds = new Box3().setFromObject(source);
  const sourceSize = sourceBounds.getSize(new Vector3());
  if (!Number.isFinite(sourceSize.x) || sourceSize.x <= 0) {
    throw new Error("UFO model has no measurable width.");
  }

  const wrapper = new Group();
  const centeredSource = new Group();
  const sourceCenter = sourceBounds.getCenter(new Vector3());
  source.position.sub(sourceCenter);
  centeredSource.add(source);
  centeredSource.scale.setScalar(targetWidth / sourceSize.x);
  wrapper.add(centeredSource);
  wrapper.userData.targetWidth = targetWidth;
  return wrapper;
}

export async function loadUfoModel(
  targetWidth: number,
  loader: UfoGltfLoaderLike = new GLTFLoader(),
): Promise<Group> {
  const gltf = await loader.loadAsync(UFO_MODEL_URL);
  const model = normalizeUfoModel(gltf.scene, targetWidth);
  model.traverse((child: Object3D) => {
    if (!(child instanceof Mesh)) {
      return;
    }
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return model;
}

export function setUfoModelOpacity(root: Object3D, opacity: number): void {
  const clampedOpacity = Math.min(1, Math.max(0, opacity));
  root.traverse((child: Object3D) => {
    if (!(child instanceof Mesh)) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      const opacityMaterial = material as OpacityMaterial;
      const originalOpacity = typeof opacityMaterial.userData.ufoOriginalOpacity === "number"
        ? opacityMaterial.userData.ufoOriginalOpacity
        : opacityMaterial.opacity;
      opacityMaterial.userData.ufoOriginalOpacity = originalOpacity;
      opacityMaterial.transparent = clampedOpacity < 1 || originalOpacity < 1;
      opacityMaterial.opacity = originalOpacity * clampedOpacity;
      opacityMaterial.depthWrite = clampedOpacity >= 1;
      opacityMaterial.needsUpdate = true;
    });
  });
}
