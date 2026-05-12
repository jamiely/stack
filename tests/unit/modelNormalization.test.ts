import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  applyRemyModelNormalization,
  measureRemyModelNormalization,
  normalizeRemyModel,
} from "../../src/game/characters/modelNormalization";

describe("measureRemyModelNormalization", () => {
  it("returns centered bounds metrics for a loaded model", () => {
    const model = new Group();
    const mesh = new Mesh(new BoxGeometry(2, 4, 6), new MeshBasicMaterial());
    mesh.position.set(3, 5, -7);
    model.add(mesh);
    model.updateMatrixWorld(true);

    expect(measureRemyModelNormalization(model)).toEqual({
      boundsCenter: { x: 3, y: 5, z: -7 },
      baseHeight: 4,
      baseDepth: 6,
      centerOffsetFromFeet: 2,
    });
  });

  it("returns null when the measured height is invalid", () => {
    expect(measureRemyModelNormalization(new Group())).toBeNull();
  });
});

describe("applyRemyModelNormalization", () => {
  it("re-centers the model around the origin using measured metrics", () => {
    const model = new Group();
    const mesh = new Mesh(new BoxGeometry(2, 4, 6), new MeshBasicMaterial());
    mesh.position.set(3, 5, -7);
    model.add(mesh);
    model.updateMatrixWorld(true);

    const metrics = measureRemyModelNormalization(model);
    expect(metrics).not.toBeNull();

    applyRemyModelNormalization(model, metrics!);
    model.updateMatrixWorld(true);

    const normalizedBounds = new Box3().setFromObject(model);
    const normalizedCenter = normalizedBounds.getCenter(new Vector3());

    expect(normalizedCenter.x).toBeCloseTo(0, 6);
    expect(normalizedCenter.y).toBeCloseTo(0, 6);
    expect(normalizedCenter.z).toBeCloseTo(0, 6);
    expect(normalizedBounds.min.y).toBeCloseTo(-2, 6);
  });
});

describe("normalizeRemyModel", () => {
  it("returns metrics and applies the same normalization in one step", () => {
    const model = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 3, 2), new MeshBasicMaterial());
    mesh.position.set(-4, 8, 6);
    model.add(mesh);
    model.updateMatrixWorld(true);

    const metrics = normalizeRemyModel(model);
    expect(metrics).toEqual({
      boundsCenter: { x: -4, y: 8, z: 6 },
      baseHeight: 3,
      baseDepth: 2,
      centerOffsetFromFeet: 1.5,
    });

    const normalizedBounds = new Box3().setFromObject(model);
    const normalizedCenter = normalizedBounds.getCenter(new Vector3());
    expect(normalizedCenter.x).toBeCloseTo(0, 6);
    expect(normalizedCenter.y).toBeCloseTo(0, 6);
    expect(normalizedCenter.z).toBeCloseTo(0, 6);
  });
});