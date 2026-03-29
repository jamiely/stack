import type { SlabData } from "../types";

export interface CollapseVoxelSeed {
  level: number;
  center: { x: number; y: number; z: number };
  edge: number;
}

export interface ProjectedSlabSample {
  center: { x: number; y: number; z: number };
  topY: number;
}

export function isProjectedSlabNearViewport(
  sample: ProjectedSlabSample,
  viewport: { width: number; height: number },
  outsideBlocks = 2,
): boolean {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const projectedHeightPx = Math.max(1, Math.abs((sample.topY - sample.center.y) * 0.5 * height) * 2);
  const marginPx = Math.max(90, projectedHeightPx * outsideBlocks);

  const screenX = (sample.center.x * 0.5 + 0.5) * width;
  const screenY = (-sample.center.y * 0.5 + 0.5) * height;
  const nearDepth = sample.center.z > -1.5 && sample.center.z < 1.5;

  return (
    nearDepth &&
    screenX >= -marginPx &&
    screenX <= width + marginPx &&
    screenY >= -marginPx &&
    screenY <= height + marginPx
  );
}

export function createCollapseVoxelSeeds(
  slabs: SlabData[],
  maxVoxelCount: number,
  voxelSize: number,
): CollapseVoxelSeed[] {
  if (slabs.length === 0 || maxVoxelCount <= 0 || voxelSize <= 0) {
    return [];
  }

  const sorted = slabs.slice().sort((a, b) => b.position.y - a.position.y || b.level - a.level);
  const seeds: CollapseVoxelSeed[] = [];
  let remainingBudget = Math.max(1, Math.floor(maxVoxelCount));

  for (let slabIndex = 0; slabIndex < sorted.length; slabIndex += 1) {
    if (remainingBudget <= 0) {
      break;
    }

    const slab = sorted[slabIndex]!;
    const slabsRemaining = Math.max(1, sorted.length - slabIndex);
    const slabBudget = Math.max(1, Math.floor(remainingBudget / slabsRemaining));
    let slabVoxelCount = 0;

    const maxDimension = Math.max(slab.dimensions.width, slab.dimensions.height, slab.dimensions.depth);
    const dominantAxisCount = Math.max(1, Math.min(8, Math.ceil(maxDimension / voxelSize)));
    const cubeEdge = maxDimension / dominantAxisCount;
    const xCount = Math.max(1, Math.min(8, Math.round(slab.dimensions.width / cubeEdge)));
    const yCount = Math.max(1, Math.min(8, Math.round(slab.dimensions.height / cubeEdge)));
    const zCount = Math.max(1, Math.min(8, Math.round(slab.dimensions.depth / cubeEdge)));
    const cellWidth = slab.dimensions.width / xCount;
    const cellHeight = slab.dimensions.height / yCount;
    const cellDepth = slab.dimensions.depth / zCount;
    const edge = Math.max(0.14, Math.min(cellWidth, cellHeight, cellDepth) * 0.98);

    slabLoop: for (let xIndex = 0; xIndex < xCount; xIndex += 1) {
      for (let yIndex = 0; yIndex < yCount; yIndex += 1) {
        for (let zIndex = 0; zIndex < zCount; zIndex += 1) {
          if (slabVoxelCount >= slabBudget || remainingBudget <= 0) {
            break slabLoop;
          }

          const centerX = slab.position.x - slab.dimensions.width / 2 + cellWidth * (xIndex + 0.5);
          const centerY = slab.position.y - slab.dimensions.height / 2 + cellHeight * (yIndex + 0.5);
          const centerZ = slab.position.z - slab.dimensions.depth / 2 + cellDepth * (zIndex + 0.5);

          seeds.push({
            level: slab.level,
            center: { x: centerX, y: centerY, z: centerZ },
            edge,
          });

          slabVoxelCount += 1;
          remainingBudget -= 1;
        }
      }
    }
  }

  return seeds;
}
