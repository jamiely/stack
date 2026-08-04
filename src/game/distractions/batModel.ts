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

export const BAT_MODEL_URL = new URL("../../../assets/quaternius_bat.glb", import.meta.url).href;
export const BAT_FLYING_CLIP_NAME = "Bat_Flying";
export const BAT_ORBIT_VERTICAL_AMPLITUDE = 0.65;

const BAT_WORLD_SPAN_TO_SLAB_HEIGHT_RATIO = 0.8;
const BAT_MIN_WORLD_SPAN = 1.6;
const BAT_MAX_WORLD_SPAN = 2.8;
const BAT_ANIMATED_DOWNWARD_EXTENT_TO_SPAN_RATIO = 0.7;
const BAT_MOVING_SLAB_CLEARANCE = 0.25;

interface BatGltf {
  scene: Group;
  animations: AnimationClip[];
}

export interface BatGltfLoaderLike {
  loadAsync(url: string): Promise<BatGltf>;
}

export interface BatModelPrecompilerLike {
  compileAsync(scene: Object3D, camera: Camera): Promise<unknown>;
  render(scene: Object3D, camera: Camera): void;
}

export interface LoadedBatModel {
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

function waitForBatWarmupFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function resolveBatModelSpan(slabHeight: number, viewportAspect = 1): number {
  const desktopSpan = Math.min(
    BAT_MAX_WORLD_SPAN,
    Math.max(BAT_MIN_WORLD_SPAN, slabHeight * BAT_WORLD_SPAN_TO_SLAB_HEIGHT_RATIO),
  );
  const responsiveScale = viewportAspect <= 0.75 ? 0.8 : 1;
  return Math.max(BAT_MIN_WORLD_SPAN, desktopSpan * responsiveScale);
}

export function resolveBatOrbitAltitude(
  movingSlabCenterY: number,
  movingSlabHeight: number,
  viewportAspect = 1,
): number {
  const movingSlabTopY = movingSlabCenterY + movingSlabHeight * 0.5;
  const batAnimatedDownwardExtent = resolveBatModelSpan(movingSlabHeight, viewportAspect)
    * BAT_ANIMATED_DOWNWARD_EXTENT_TO_SPAN_RATIO;
  return movingSlabTopY
    + BAT_ORBIT_VERTICAL_AMPLITUDE
    + batAnimatedDownwardExtent
    + BAT_MOVING_SLAB_CLEARANCE;
}

export function normalizeBatModel(source: Group, targetSpan: number): Group {
  const sourceBounds = new Box3().setFromObject(source);
  const sourceSize = sourceBounds.getSize(new Vector3());
  const sourceSpan = Math.max(sourceSize.x, sourceSize.y);
  if (!Number.isFinite(sourceSpan) || sourceSpan <= 0) {
    throw new Error("Bat model has no measurable front-view span.");
  }

  const wrapper = new Group();
  const centeredSource = new Group();
  const sourceCenter = sourceBounds.getCenter(new Vector3());
  source.position.sub(sourceCenter);
  centeredSource.add(source);
  centeredSource.scale.setScalar(targetSpan / sourceSpan);
  wrapper.add(centeredSource);
  wrapper.userData.targetSpan = targetSpan;
  return wrapper;
}

export async function loadBatModel(
  targetSpan: number,
  loader: BatGltfLoaderLike = new GLTFLoader(),
): Promise<LoadedBatModel> {
  const gltf = await loader.loadAsync(BAT_MODEL_URL);
  const clip = gltf.animations.find((candidate) => candidate.name === BAT_FLYING_CLIP_NAME);
  if (!clip) {
    throw new Error(`Bat model is missing the ${BAT_FLYING_CLIP_NAME} animation.`);
  }

  const model = normalizeBatModel(gltf.scene, targetSpan);
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

export async function precompileBatModel(
  renderer: BatModelPrecompilerLike,
  scene: Object3D,
  camera: Camera,
  modelRoot: Group,
  nextFrame: () => Promise<void> = waitForBatWarmupFrame,
): Promise<void> {
  const wasVisible = modelRoot.visible;
  modelRoot.visible = true;
  setBatModelOpacity(modelRoot, 0);
  try {
    await renderer.compileAsync(scene, camera);
    setBatModelOpacity(modelRoot, 1 / 255);
    renderer.render(scene, camera);
    await nextFrame();
    await nextFrame();
  } finally {
    setBatModelOpacity(modelRoot, 0);
    modelRoot.visible = wasVisible;
  }
}

export function setBatModelOpacity(root: Object3D, opacity: number): void {
  const clampedOpacity = Math.min(1, Math.max(0, opacity));
  root.traverse((child: Object3D) => {
    if (!(child instanceof Mesh)) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      const opacityMaterial = material as OpacityMaterial;
      const originalOpacity = typeof opacityMaterial.userData.batOriginalOpacity === "number"
        ? opacityMaterial.userData.batOriginalOpacity
        : opacityMaterial.opacity;
      opacityMaterial.userData.batOriginalOpacity = originalOpacity;
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
