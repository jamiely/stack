import { readFileSync } from "node:fs";
import { AnimationClip, Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import {
  BAT_FLYING_CLIP_NAME,
  loadBatModel,
  normalizeBatModel,
  precompileBatModel,
  resolveBatModelSpan,
  resolveBatOrbitAltitude,
  sampleBatOrbitPosition,
  setBatModelOpacity,
} from "../../src/game/distractions/batModel";
import { resolveUfoOrbitAltitude } from "../../src/game/distractions/ufoModel";

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

  it("keeps the animated bat smaller than the UFO so it does not dominate portrait play", () => {
    expect(resolveBatModelSpan(3)).toBeCloseTo(1.8, 5);
    expect(resolveBatModelSpan(1)).toBe(1.25);
    expect(resolveBatModelSpan(5)).toBe(2.1);
    expect(resolveBatModelSpan(3, 0.5)).toBeCloseTo(1.44, 5);
  });

  it("keeps the bat flight band lower on screen than the UFO band", () => {
    const landedTopCenterY = 12;

    for (const slabHeight of [1, 3, 5]) {
      for (const viewportAspect of [0.5, 1]) {
        const movingSlabCenterY = landedTopCenterY + slabHeight;
        const batOrbitCenterY = resolveBatOrbitAltitude(movingSlabCenterY, slabHeight, viewportAspect);
        const ufoOrbitCenterY = resolveUfoOrbitAltitude(landedTopCenterY, slabHeight);

        expect(batOrbitCenterY).toBeLessThan(ufoOrbitCenterY - slabHeight * 0.35);
      }
    }
  });

  it("keeps the real animated low-flying bat envelope clear of the moving block", async () => {
    const glb = readFileSync(new URL("../../assets/quaternius_bat.glb", import.meta.url));
    const arrayBuffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer;
    const parsed = await new GLTFLoader().parseAsync(arrayBuffer, "");
    const loaded = await loadBatModel(1, {
      loadAsync: async () => ({ scene: parsed.scene, animations: parsed.animations }),
    });
    let normalizedAnimatedMinY = Number.POSITIVE_INFINITY;
    let normalizedAnimatedMaxY = Number.NEGATIVE_INFINITY;
    let normalizedAnimatedHalfWidth = 0;
    let normalizedAnimatedHalfDepth = 0;
    for (let sample = 0; sample <= 60; sample += 1) {
      loaded.mixer.setTime(loaded.clip.duration * sample / 60);
      loaded.model.updateMatrixWorld(true);
      const sampleBounds = new Box3().setFromObject(loaded.model, true);
      normalizedAnimatedMinY = Math.min(normalizedAnimatedMinY, sampleBounds.min.y);
      normalizedAnimatedMaxY = Math.max(normalizedAnimatedMaxY, sampleBounds.max.y);
      normalizedAnimatedHalfWidth = Math.max(
        normalizedAnimatedHalfWidth,
        Math.max(Math.abs(sampleBounds.min.x), Math.abs(sampleBounds.max.x)),
      );
      normalizedAnimatedHalfDepth = Math.max(
        normalizedAnimatedHalfDepth,
        Math.max(Math.abs(sampleBounds.min.z), Math.abs(sampleBounds.max.z)),
      );
    }
    const landedTopCenterY = 12;
    const movingSlabCenterX = 0;
    const movingSlabCenterZ = 0;
    const clearanceMargin = 0.2;

    for (const slabHeight of [1, 3, 5]) {
      for (const viewportAspect of [0.5, 1]) {
        const movingSlabCenterY = landedTopCenterY + slabHeight;
        const batSpan = resolveBatModelSpan(slabHeight, viewportAspect);
        const batHalfWidth = normalizedAnimatedHalfWidth * batSpan;
        const batHalfDepth = normalizedAnimatedHalfDepth * batSpan;
        const batMinY = normalizedAnimatedMinY * batSpan;
        const batMaxY = normalizedAnimatedMaxY * batSpan;
        for (let phaseSample = 0; phaseSample < 96; phaseSample += 1) {
          const phase = phaseSample / 96 * Math.PI * 2;
          const sample = sampleBatOrbitPosition({
            centerX: movingSlabCenterX,
            movingSlabCenterY,
            centerZ: movingSlabCenterZ,
            slabWidth: 7,
            slabHeight,
            slabDepth: 7,
            baseWidth: 7,
            signal: phaseSample % 2,
            phase,
            viewportAspect,
          });
          const separatedOnX = sample.x + batHalfWidth < movingSlabCenterX - 3.5 - clearanceMargin
            || sample.x - batHalfWidth > movingSlabCenterX + 3.5 + clearanceMargin;
          const separatedOnY = sample.y + batMaxY < movingSlabCenterY - slabHeight * 0.5 - clearanceMargin
            || sample.y + batMinY > movingSlabCenterY + slabHeight * 0.5 + clearanceMargin;
          const separatedOnZ = sample.z + batHalfDepth < movingSlabCenterZ - 3.5 - clearanceMargin
            || sample.z - batHalfDepth > movingSlabCenterZ + 3.5 + clearanceMargin;

          expect(separatedOnX || separatedOnY || separatedOnZ).toBe(true);
        }
      }
    }
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
