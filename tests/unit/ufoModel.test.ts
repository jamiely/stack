import { readFileSync } from "node:fs";
import { Box3, BoxGeometry, DataTexture, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  loadUfoModel,
  normalizeUfoModel,
  precompileUfoModel,
  resolveUfoModelWidth,
  resolveUfoOrbitAltitude,
  resolveUfoOrbitRadius,
  setUfoModelOpacity,
} from "../../src/game/distractions/ufoModel";

describe("UFO model presentation", () => {
  it("keeps the embedded texture payload below the first-appearance upload budget", () => {
    const glb = readFileSync(new URL("../../assets/flying_saucer_a.glb", import.meta.url));
    const jsonChunkLength = glb.readUInt32LE(12);
    const manifest = JSON.parse(glb.subarray(20, 20 + jsonChunkLength).toString("utf8"));
    const textureBytes = manifest.images.reduce(
      (total: number, image: { bufferView: number }) => total + manifest.bufferViews[image.bufferView].byteLength,
      0,
    );

    expect(textureBytes).toBeLessThanOrEqual(512 * 1024);
  });

  it("keeps the saucer readable without making it as wide as the tower", () => {
    expect(resolveUfoModelWidth(3)).toBeCloseTo(4.05, 5);
    expect(resolveUfoModelWidth(1)).toBe(2.5);
    expect(resolveUfoModelWidth(5)).toBe(4.2);
    expect(resolveUfoModelWidth(3, 0.5)).toBeCloseTo(2.916, 5);
    expect(resolveUfoModelWidth(1, 0.5)).toBe(2.5);
  });

  it("keeps the 3D flyby close enough to remain readable around the tower", () => {
    expect(resolveUfoOrbitRadius(7, 0)).toBeCloseTo(5.46, 5);
    expect(resolveUfoOrbitRadius(7, 1)).toBeCloseTo(6.36, 5);
    expect(resolveUfoOrbitRadius(2, 0)).toBe(3.2);
  });

  it("routes the UFO fully above the moving slab instead of through its center plane", () => {
    const landedTopCenterY = 12;

    for (const slabHeight of [1, 3, 5]) {
      const movingSlabTopY = landedTopCenterY + slabHeight * 1.5;
      const ufoHalfHeight = resolveUfoModelWidth(slabHeight) * 0.267 * 0.5;
      const lowestBobbedUfoBottomY = resolveUfoOrbitAltitude(landedTopCenterY, slabHeight) - 0.18 - ufoHalfHeight;

      expect(lowestBobbedUfoBottomY).toBeGreaterThan(movingSlabTopY + 0.2);
    }
  });

  it("centers and scales a loaded saucer to the requested world width", () => {
    const source = new Group();
    const mesh = new Mesh(new BoxGeometry(10, 2, 6), new MeshStandardMaterial());
    mesh.position.set(4, 3, -2);
    source.add(mesh);

    const normalized = normalizeUfoModel(source, 5);
    const bounds = new Box3().setFromObject(normalized);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());

    expect(size.x).toBeCloseTo(5, 5);
    expect(center.x).toBeCloseTo(0, 5);
    expect(center.y).toBeCloseTo(0, 5);
    expect(center.z).toBeCloseTo(0, 5);
  });

  it("loads through the game loader seam with lightweight render materials", async () => {
    const source = new Group();
    const sourceTexture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    const sourceMaterial = new MeshStandardMaterial({ map: sourceTexture });
    source.add(new Mesh(new BoxGeometry(8, 2, 5), sourceMaterial));
    const requestedUrls: string[] = [];
    const loader = {
      loadAsync: async (url: string) => {
        requestedUrls.push(url);
        return { scene: source };
      },
    };

    const loaded = await loadUfoModel(4, loader);
    const width = new Box3().setFromObject(loaded).getSize(new Vector3()).x;
    const loadedMesh = loaded.getObjectByProperty("isMesh", true) as Mesh;

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain("flying_saucer_a.glb");
    expect(width).toBeCloseTo(4, 5);
    expect(loadedMesh.material).toBeInstanceOf(MeshBasicMaterial);
    expect((loadedMesh.material as MeshBasicMaterial).map).toBe(sourceTexture);
  });

  it("precompiles the transparent first-appearance shader before exposing the model", async () => {
    const scene = new Group();
    const modelRoot = new Group();
    const texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    texture.needsUpdate = true;
    const material = new MeshStandardMaterial({ map: texture });
    modelRoot.add(new Mesh(new BoxGeometry(1, 1, 1), material));
    modelRoot.visible = false;
    scene.add(modelRoot);
    const visibilityDuringCompile: boolean[] = [];
    const visibilityDuringUpload: boolean[] = [];
    const opacityDuringUpload: number[] = [];
    const warmedTextures: DataTexture[] = [];
    const renderer = {
      compileAsync: async () => {
        visibilityDuringCompile.push(modelRoot.visible);
      },
      initTexture: (candidate: DataTexture) => {
        warmedTextures.push(candidate);
      },
      render: () => {
        visibilityDuringUpload.push(modelRoot.visible);
        opacityDuringUpload.push(material.opacity);
      },
    };

    let warmupFrames = 0;
    await precompileUfoModel(renderer, scene, {} as never, modelRoot, async () => {
      warmupFrames += 1;
    });

    expect(warmupFrames).toBe(2);
    expect(visibilityDuringCompile).toEqual([true]);
    expect(warmedTextures).toEqual([texture]);
    expect(visibilityDuringUpload).toEqual([true]);
    expect(opacityDuringUpload[0]).toBeGreaterThan(0);
    expect(modelRoot.visible).toBe(false);
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(0);
    expect(material.depthWrite).toBe(false);
  });

  it("does not invalidate the UFO shader when only fade opacity changes", () => {
    const source = new Group();
    const material = new MeshStandardMaterial();
    source.add(new Mesh(new BoxGeometry(1, 1, 1), material));

    setUfoModelOpacity(source, 0);
    const warmedVersion = material.version;
    setUfoModelOpacity(source, 0.5);

    expect(material.version).toBe(warmedVersion);
    expect(material.opacity).toBeCloseTo(0.5, 5);
  });

  it("applies fade opacity without disabling the source material depth test", () => {
    const source = new Group();
    const material = new MeshStandardMaterial({ opacity: 0.8 });
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
    source.add(mesh);

    setUfoModelOpacity(source, 0.5);

    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(0.4, 5);
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(false);
  });
});
