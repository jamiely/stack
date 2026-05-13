import { describe, expect, it } from "vitest";
import { Group, Mesh, BoxGeometry, MeshBasicMaterial } from "three";
import {
  applyBestCharacterUpAxisRotation,
  buildCharacterViewFromGltf,
  prepareCharacterModelForRendering,
  selectLargestCharacterScene,
} from "../../src/game/characters/modelPreparation";

describe("character model preparation", () => {
  it("selects the largest positive-volume scene", () => {
    const tiny = new Group();
    tiny.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()));

    const flat = new Group();
    flat.add(new Mesh(new BoxGeometry(2, 0, 3), new MeshBasicMaterial()));

    const large = new Group();
    large.add(new Mesh(new BoxGeometry(2, 3, 4), new MeshBasicMaterial()));

    expect(selectLargestCharacterScene([tiny, flat, large])).toBe(large);
  });

  it("rotates the model to maximize vertical height", () => {
    const model = new Mesh(new BoxGeometry(1, 1, 4), new MeshBasicMaterial());

    applyBestCharacterUpAxisRotation(model);
    model.updateMatrixWorld(true);
    const size = model.geometry.boundingBox?.clone();
    model.geometry.computeBoundingBox();

    expect(Math.abs(model.rotation.x)).toBeCloseTo(Math.PI / 2, 5);
    expect(size).not.toBeNull();
  });

  it("disables frustum culling on nested meshes", () => {
    const root = new Group();
    const child = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
    child.add(mesh);
    root.add(child);

    prepareCharacterModelForRendering(root);

    expect(mesh.frustumCulled).toBe(false);
  });

  it("builds a character view from a loaded gltf scene", () => {
    const root = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 2, 1), new MeshBasicMaterial());
    root.add(mesh);

    const built = buildCharacterViewFromGltf(
      {
        scene: root,
        scenes: [root],
        animations: [],
      },
      {
        characterId: "remy",
        nameSuffix: "test",
      },
    );

    expect(built).not.toBeNull();
    expect(built?.view.baseHeight).toBeGreaterThan(0);
    expect(built?.view.baseDepth).toBeGreaterThan(0);
    expect(built?.animations).toEqual([]);
  });
});
