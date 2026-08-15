import { readFileSync } from "node:fs";
import { AnimationClip, Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import {
  GORILLA_CLIMB_CLIP_NAME,
  loadGorillaModel,
  normalizeGorillaModel,
  precompileGorillaModel,
  resolveGorillaModelHeight,
  setGorillaModelOpacity,
} from "../../src/game/distractions/gorillaModel";

async function parseGorillaGlb() {
  const previousSelf = globalThis.self;
  const previousCreateImageBitmap = globalThis.createImageBitmap;
  globalThis.self = globalThis as Window & typeof globalThis;
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close: () => undefined }) as ImageBitmap;
  try {
    const glb = readFileSync(new URL("../../assets/quaternius_yeti_model_b.glb", import.meta.url));
    const arrayBuffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer;
    return await new GLTFLoader().parseAsync(arrayBuffer, "");
  } finally {
    globalThis.self = previousSelf;
    globalThis.createImageBitmap = previousCreateImageBitmap;
  }
}

describe("gorilla model presentation", () => {
  it("keeps Model B inside the animated distraction runtime budget", () => {
    const glb = readFileSync(new URL("../../assets/quaternius_yeti_model_b.glb", import.meta.url));
    const jsonChunkLength = glb.readUInt32LE(12);
    const manifest = JSON.parse(glb.subarray(20, 20 + jsonChunkLength).toString("utf8"));
    const triangles = manifest.meshes.reduce(
      (total: number, mesh: { primitives: Array<{ indices?: number; attributes: { POSITION: number } }> }) =>
        total + mesh.primitives.reduce((meshTotal, primitive) => {
          const accessorIndex = primitive.indices ?? primitive.attributes.POSITION;
          return meshTotal + manifest.accessors[accessorIndex].count / 3;
        }, 0),
      0,
    );

    expect(glb.byteLength).toBeLessThanOrEqual(700 * 1024);
    expect(manifest.images).toHaveLength(1);
    expect(triangles).toBeLessThanOrEqual(6_200);
    expect(manifest.animations.some((clip: { name: string }) => clip.name === GORILLA_CLIMB_CLIP_NAME)).toBe(true);
  });

  it("sizes the gorilla as a ledge-scale climber instead of a facade-sized overlay", () => {
    expect(resolveGorillaModelHeight(3)).toBeCloseTo(2.34, 5);
    expect(resolveGorillaModelHeight(1)).toBe(1.8);
    expect(resolveGorillaModelHeight(5)).toBe(2.7);
    expect(resolveGorillaModelHeight(3, 0.5)).toBeCloseTo(1.9188, 5);
  });

  it("grounds and scales the source model to the requested height", () => {
    const source = new Group();
    const mesh = new Mesh(new BoxGeometry(4, 8, 2), new MeshStandardMaterial());
    mesh.position.set(3, 5, -4);
    source.add(mesh);

    const normalized = normalizeGorillaModel(source, 2.6);
    const bounds = new Box3().setFromObject(normalized);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());

    expect(size.y).toBeCloseTo(2.6, 5);
    expect(bounds.min.y).toBeCloseTo(0, 5);
    expect(center.x).toBeCloseTo(0, 5);
    expect(center.z).toBeCloseTo(0, 5);
  });

  it("loads through the game loader seam and starts the named climbing clip", async () => {
    const source = new Group();
    const sourceMaterial = new MeshStandardMaterial({ opacity: 0.8 });
    source.add(new Mesh(new BoxGeometry(4, 8, 2), sourceMaterial));
    const clip = new AnimationClip(GORILLA_CLIMB_CLIP_NAME, 1, []);
    const requestedUrls: string[] = [];
    const loader = {
      loadAsync: async (url: string) => {
        requestedUrls.push(url);
        return { scene: source, animations: [clip] };
      },
    };

    const loaded = await loadGorillaModel(2.4, loader);
    const loadedMesh = loaded.model.getObjectByProperty("isMesh", true) as Mesh;
    const loadedMaterial = loadedMesh.material as MeshStandardMaterial;

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain("quaternius_yeti_model_b.glb");
    expect(loaded.clip.name).toBe(GORILLA_CLIMB_CLIP_NAME);
    expect(loaded.action.isRunning()).toBe(true);
    expect(loadedMaterial).not.toBe(sourceMaterial);
    expect(loadedMesh.castShadow).toBe(true);
    expect(loadedMesh.receiveShadow).toBe(true);
  });

  it("load-tests the real GLB through Three.js GLTFLoader", async () => {
    const parsed = await parseGorillaGlb();
    expect(parsed.animations.map((clip) => clip.name)).toContain(GORILLA_CLIMB_CLIP_NAME);
    let meshes = 0;
    parsed.scene.traverse((child) => {
      if (child instanceof Mesh) {
        meshes += 1;
      }
    });
    expect(meshes).toBeGreaterThan(0);
  });

  it("precompiles the transparent first-appearance shader before exposing the gorilla", async () => {
    const scene = new Group();
    const modelRoot = new Group();
    const material = new MeshStandardMaterial();
    modelRoot.add(new Mesh(new BoxGeometry(1, 1, 1), material));
    modelRoot.visible = false;
    scene.add(modelRoot);
    const visibilityDuringCompile: boolean[] = [];
    const visibilityDuringUpload: boolean[] = [];
    const opacityDuringUpload: number[] = [];
    const renderer = {
      compileAsync: async () => {
        visibilityDuringCompile.push(modelRoot.visible);
      },
      render: () => {
        visibilityDuringUpload.push(modelRoot.visible);
        opacityDuringUpload.push(material.opacity);
      },
    };

    let warmupFrames = 0;
    await precompileGorillaModel(renderer, scene, {} as never, modelRoot, async () => {
      warmupFrames += 1;
    });

    expect(warmupFrames).toBe(2);
    expect(visibilityDuringCompile).toEqual([true]);
    expect(visibilityDuringUpload).toEqual([true]);
    expect(opacityDuringUpload[0]).toBeGreaterThan(0);
    expect(modelRoot.visible).toBe(false);
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(0);
    expect(material.depthWrite).toBe(false);
  });

  it("fades owned materials while preserving depth testing", () => {
    const source = new Group();
    const material = new MeshStandardMaterial({ opacity: 0.8 });
    source.add(new Mesh(new BoxGeometry(1, 1, 1), material));

    setGorillaModelOpacity(source, 0.5);

    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(0.4, 5);
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(false);
  });
});
