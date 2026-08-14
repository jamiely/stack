import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Box3,
  type Camera,
  Group,
  type Material,
  Mesh,
  type Object3D,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const GORILLA_MODEL_URL = new URL("../../../assets/quaternius_yeti_model_b.glb", import.meta.url).href;
export const GORILLA_CLIMB_CLIP_NAME = "Walk";

const GORILLA_WORLD_HEIGHT_TO_SLAB_HEIGHT_RATIO = 1.55;
const GORILLA_MIN_WORLD_HEIGHT = 3.1;
const GORILLA_MAX_WORLD_HEIGHT = 5.2;

interface GorillaGltf {
  scene: Group;
  animations: AnimationClip[];
}

export interface GorillaGltfLoaderLike {
  loadAsync(url: string): Promise<GorillaGltf>;
}

export interface GorillaModelPrecompilerLike {
  compileAsync(scene: Object3D, camera: Camera): Promise<unknown>;
  render(scene: Object3D, camera: Camera): void;
}

export interface LoadedGorillaModel {
  model: Group;
  mixer: AnimationMixer;
  clip: AnimationClip;
  action: AnimationAction;
}

type OpacityMaterial = Material & {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  userData: Record<string, unknown>;
};

function waitForGorillaWarmupFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function resolveGorillaModelHeight(slabHeight: number, viewportAspect = 1): number {
  const desktopHeight = Math.min(
    GORILLA_MAX_WORLD_HEIGHT,
    Math.max(GORILLA_MIN_WORLD_HEIGHT, slabHeight * GORILLA_WORLD_HEIGHT_TO_SLAB_HEIGHT_RATIO),
  );
  const responsiveScale = viewportAspect <= 0.75 ? 0.82 : 1;
  return Math.max(GORILLA_MIN_WORLD_HEIGHT, desktopHeight * responsiveScale);
}

export function normalizeGorillaModel(source: Group, targetHeight: number): Group {
  const sourceBounds = new Box3().setFromObject(source);
  const sourceSize = sourceBounds.getSize(new Vector3());
  if (!Number.isFinite(sourceSize.y) || sourceSize.y <= 0) {
    throw new Error("Gorilla model has no measurable height.");
  }

  const wrapper = new Group();
  const groundedSource = new Group();
  const sourceCenter = sourceBounds.getCenter(new Vector3());
  source.position.x -= sourceCenter.x;
  source.position.y -= sourceBounds.min.y;
  source.position.z -= sourceCenter.z;
  groundedSource.add(source);
  groundedSource.scale.setScalar(targetHeight / sourceSize.y);
  wrapper.add(groundedSource);
  wrapper.userData.targetHeight = targetHeight;
  return wrapper;
}

export async function loadGorillaModel(
  targetHeight: number,
  loader: GorillaGltfLoaderLike = new GLTFLoader(),
): Promise<LoadedGorillaModel> {
  const gltf = await loader.loadAsync(GORILLA_MODEL_URL);
  const clip = gltf.animations.find((candidate) => candidate.name === GORILLA_CLIMB_CLIP_NAME);
  if (!clip) {
    throw new Error(`Gorilla model is missing the ${GORILLA_CLIMB_CLIP_NAME} animation.`);
  }

  const model = normalizeGorillaModel(gltf.scene, targetHeight);
  const materialCache = new Map<Material, Material>();
  model.traverse((child: Object3D) => {
    if (!(child instanceof Mesh)) {
      return;
    }

    const cloneMaterial = (material: Material): Material => {
      const cached = materialCache.get(material);
      if (cached) {
        return cached;
      }
      const clone = material.clone();
      materialCache.set(material, clone);
      return clone;
    };

    child.material = Array.isArray(child.material)
      ? child.material.map(cloneMaterial)
      : cloneMaterial(child.material);
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const mixer = new AnimationMixer(model);
  const action = mixer.clipAction(clip);
  action.play();
  return { model, mixer, clip, action };
}

export async function precompileGorillaModel(
  renderer: GorillaModelPrecompilerLike,
  scene: Object3D,
  camera: Camera,
  modelRoot: Group,
  nextFrame: () => Promise<void> = waitForGorillaWarmupFrame,
): Promise<void> {
  const wasVisible = modelRoot.visible;
  modelRoot.visible = true;
  setGorillaModelOpacity(modelRoot, 0);
  try {
    await renderer.compileAsync(scene, camera);
    setGorillaModelOpacity(modelRoot, 1 / 255);
    renderer.render(scene, camera);
    await nextFrame();
    await nextFrame();
  } finally {
    setGorillaModelOpacity(modelRoot, 0);
    modelRoot.visible = wasVisible;
  }
}

export function setGorillaModelOpacity(root: Object3D, opacity: number): void {
  const clampedOpacity = Math.min(1, Math.max(0, opacity));
  root.traverse((child: Object3D) => {
    if (!(child instanceof Mesh)) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      const opacityMaterial = material as OpacityMaterial;
      const originalOpacity = typeof opacityMaterial.userData.gorillaOriginalOpacity === "number"
        ? opacityMaterial.userData.gorillaOriginalOpacity
        : opacityMaterial.opacity;
      opacityMaterial.userData.gorillaOriginalOpacity = originalOpacity;
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
