import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  loadUfoModel,
  normalizeUfoModel,
  resolveUfoModelWidth,
  resolveUfoOrbitRadius,
  setUfoModelOpacity,
} from "../../src/game/distractions/ufoModel";

describe("UFO model presentation", () => {
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

  it("loads through the game loader seam and returns a normalized scene", async () => {
    const source = new Group();
    source.add(new Mesh(new BoxGeometry(8, 2, 5), new MeshStandardMaterial()));
    const requestedUrls: string[] = [];
    const loader = {
      loadAsync: async (url: string) => {
        requestedUrls.push(url);
        return { scene: source };
      },
    };

    const loaded = await loadUfoModel(4, loader);
    const width = new Box3().setFromObject(loaded).getSize(new Vector3()).x;

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain("flying_saucer_a.glb");
    expect(width).toBeCloseTo(4, 5);
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
