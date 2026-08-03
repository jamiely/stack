import { readFileSync } from "node:fs";
import { AnimationClip, Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  BAT_FLYING_CLIP_NAME,
  loadBatModel,
  normalizeBatModel,
  precompileBatModel,
  resolveBatModelSpan,
  setBatModelOpacity,
} from "../../src/game/distractions/batModel";

describe("bat model presentation", () => {
  it("keeps the self-contained animated asset inside its mobile runtime budget", () => {
    const glb = readFileSync(new URL("../../assets/quaternius_bat.glb", import.meta.url));
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

    expect(glb.byteLength).toBeLessThanOrEqual(256 * 1024);
    expect(manifest.images ?? []).toHaveLength(0);
    expect(triangles).toBeLessThanOrEqual(1_100);
    expect(manifest.animations).toHaveLength(1);
    expect(manifest.animations[0].name).toBe(BAT_FLYING_CLIP_NAME);
  });

  it("keeps the animated bat readable without letting it dominate portrait play", () => {
    expect(resolveBatModelSpan(3)).toBeCloseTo(2.4, 5);
    expect(resolveBatModelSpan(1)).toBe(1.6);
    expect(resolveBatModelSpan(5)).toBe(2.8);
    expect(resolveBatModelSpan(3, 0.5)).toBeCloseTo(1.92, 5);
  });

  it("centers and scales the larger front-view dimension to the requested span", () => {
    const source = new Group();
    const mesh = new Mesh(new BoxGeometry(4, 8, 2), new MeshStandardMaterial());
    mesh.position.set(3, 5, -4);
    source.add(mesh);

    const normalized = normalizeBatModel(source, 2.4);
    const bounds = new Box3().setFromObject(normalized);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());

    expect(Math.max(size.x, size.y)).toBeCloseTo(2.4, 5);
    expect(center.x).toBeCloseTo(0, 5);
    expect(center.y).toBeCloseTo(0, 5);
    expect(center.z).toBeCloseTo(0, 5);
  });

  it("loads through the game loader seam and starts the named flying clip", async () => {
    const source = new Group();
    const sourceMaterial = new MeshStandardMaterial({ opacity: 0.8 });
    source.add(new Mesh(new BoxGeometry(4, 8, 2), sourceMaterial));
    const clip = new AnimationClip(BAT_FLYING_CLIP_NAME, 1.25, []);
    const requestedUrls: string[] = [];
    const loader = {
      loadAsync: async (url: string) => {
        requestedUrls.push(url);
        return { scene: source, animations: [clip] };
      },
    };

    const loaded = await loadBatModel(2.4, loader);
    const loadedMesh = loaded.model.getObjectByProperty("isMesh", true) as Mesh;
    const loadedMaterial = loadedMesh.material as MeshStandardMaterial;

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain("quaternius_bat.glb");
    expect(loaded.clip.name).toBe(BAT_FLYING_CLIP_NAME);
    expect(loaded.action.isRunning()).toBe(true);
    expect(loadedMaterial).not.toBe(sourceMaterial);
    expect(loadedMesh.castShadow).toBe(true);
    expect(loadedMesh.receiveShadow).toBe(true);
  });

  it("precompiles the transparent first-appearance shader before exposing the bat", async () => {
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
    await precompileBatModel(renderer, scene, {} as never, modelRoot, async () => {
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

    setBatModelOpacity(source, 0.5);

    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(0.4, 5);
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(false);
  });
});
