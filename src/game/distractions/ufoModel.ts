import {
  Box3,
  type Camera,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Material,
  type Object3D,
  Texture,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const UFO_MODEL_URL = new URL("../../../assets/flying_saucer_a.glb", import.meta.url).href;

const UFO_WORLD_WIDTH_TO_SLAB_HEIGHT_RATIO = 1.35;
const UFO_MIN_WORLD_WIDTH = 2.5;
const UFO_MAX_WORLD_WIDTH = 4.2;
const UFO_ORBIT_HEIGHT_IN_SLABS = 2.25;

interface UfoGltf {
  scene: Group;
}

export interface UfoGltfLoaderLike {
  loadAsync(url: string): Promise<UfoGltf>;
}

export interface UfoModelPrecompilerLike {
  compileAsync(scene: Object3D, camera: Camera): Promise<unknown>;
  initTexture(texture: Texture): void;
  render(scene: Object3D, camera: Camera): void;
}

function waitForUfoWarmupFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
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

export function resolveUfoOrbitAltitude(topSlabCenterY: number, slabHeight: number): number {
  return topSlabCenterY + slabHeight * UFO_ORBIT_HEIGHT_IN_SLABS;
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

function createLightweightUfoMaterial(material: Material): Material {
  if (!(material instanceof MeshStandardMaterial)) {
    return material;
  }

  const usesEmissiveMap = material.emissiveMap !== null;
  return new MeshBasicMaterial({
    name: material.name,
    color: usesEmissiveMap ? material.emissive : material.color,
    map: material.emissiveMap ?? material.map,
    alphaMap: material.alphaMap,
    alphaTest: material.alphaTest,
    opacity: material.opacity,
    side: material.side,
    transparent: true,
    depthWrite: false,
    vertexColors: material.vertexColors,
  });
}

export async function loadUfoModel(
  targetWidth: number,
  loader: UfoGltfLoaderLike = new GLTFLoader(),
): Promise<Group> {
  const gltf = await loader.loadAsync(UFO_MODEL_URL);
  const model = normalizeUfoModel(gltf.scene, targetWidth);
  const materialCache = new Map<Material, Material>();
  model.traverse((child: Object3D) => {
    if (!(child instanceof Mesh)) {
      return;
    }
    const resolveMaterial = (material: Material): Material => {
      const cached = materialCache.get(material);
      if (cached) {
        return cached;
      }
      const lightweightMaterial = createLightweightUfoMaterial(material);
      materialCache.set(material, lightweightMaterial);
      return lightweightMaterial;
    };
    child.material = Array.isArray(child.material)
      ? child.material.map(resolveMaterial)
      : resolveMaterial(child.material);
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return model;
}

export async function precompileUfoModel(
  renderer: UfoModelPrecompilerLike,
  scene: Object3D,
  camera: Camera,
  modelRoot: Group,
  nextFrame: () => Promise<void> = waitForUfoWarmupFrame,
): Promise<void> {
  const wasVisible = modelRoot.visible;
  modelRoot.visible = true;
  setUfoModelOpacity(modelRoot, 0);
  const textures = new Set<Texture>();
  modelRoot.traverse((child: Object3D) => {
    if (!(child instanceof Mesh)) {
      return;
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof Texture) {
          textures.add(value);
        }
      });
    });
  });
  textures.forEach((texture) => renderer.initTexture(texture));
  try {
    await renderer.compileAsync(scene, camera);
    setUfoModelOpacity(modelRoot, 1 / 255);
    renderer.render(scene, camera);
    await nextFrame();
    await nextFrame();
  } finally {
    setUfoModelOpacity(modelRoot, 0);
    modelRoot.visible = wasVisible;
  }
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
      const renderStateChanged = !opacityMaterial.transparent || opacityMaterial.depthWrite;
      opacityMaterial.transparent = true;
      opacityMaterial.opacity = originalOpacity * clampedOpacity;
      opacityMaterial.depthWrite = false;
      if (renderStateChanged) {
        opacityMaterial.needsUpdate = true;
      }
    });
  });
}
