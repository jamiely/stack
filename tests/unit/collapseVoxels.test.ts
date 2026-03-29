import { describe, expect, it } from "vitest";
import { createCollapseVoxelSeeds, isProjectedSlabNearViewport } from "../../src/game/logic/collapseVoxels";
import type { SlabData } from "../../src/game/types";

function slab(level: number, y: number, dimensions = { width: 4, depth: 4, height: 2 }): SlabData {
  return {
    level,
    axis: "x",
    position: { x: 0, y, z: 0 },
    dimensions,
    direction: 1,
  };
}

describe("collapse voxel planning", () => {
  it("caps generated seeds at max voxel count", () => {
    const seeds = createCollapseVoxelSeeds([slab(1, 0, { width: 8, depth: 8, height: 4 })], 25, 0.38);
    expect(seeds.length).toBeLessThanOrEqual(25);
    expect(seeds.length).toBeGreaterThan(0);
  });

  it("distributes voxel budget so top slabs are represented", () => {
    const slabs = [slab(1, 0), slab(2, 3), slab(3, 6)];
    const seeds = createCollapseVoxelSeeds(slabs, 3, 0.5);
    const representedLevels = new Set(seeds.map((seed) => seed.level));

    expect(seeds).toHaveLength(3);
    expect(representedLevels.has(3)).toBe(true);
    expect(representedLevels.has(2)).toBe(true);
    expect(representedLevels.has(1)).toBe(true);
  });

  it("keeps voxels cube-like with uniform edge lengths", () => {
    const seeds = createCollapseVoxelSeeds([slab(8, 0, { width: 6, depth: 3, height: 2 })], 50, 0.38);
    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds.every((seed) => seed.edge >= 0.14)).toBe(true);
  });
});

describe("projected slab screen culling", () => {
  const viewport = { width: 1000, height: 700 };

  it("includes slabs inside viewport bounds", () => {
    const near = isProjectedSlabNearViewport(
      {
        center: { x: 0, y: 0, z: 0 },
        topY: -0.2,
      },
      viewport,
      2,
    );

    expect(near).toBe(true);
  });

  it("excludes slabs too far outside viewport bounds", () => {
    const far = isProjectedSlabNearViewport(
      {
        center: { x: 4.8, y: 0, z: 0 },
        topY: -0.2,
      },
      viewport,
      2,
    );

    expect(far).toBe(false);
  });

  it("excludes slabs behind/too far in depth", () => {
    const farDepth = isProjectedSlabNearViewport(
      {
        center: { x: 0, y: 0, z: 2 },
        topY: -0.2,
      },
      viewport,
      2,
    );

    expect(farDepth).toBe(false);
  });
});
