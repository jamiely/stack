import type { Axis, DebugConfig, SlabData, TrimResult } from "../types";

export function getAxisForLevel(level: number): Axis {
  return level % 2 === 1 ? "x" : "z";
}

export function createInitialStack(config: DebugConfig): SlabData[] {
  const slabs: SlabData[] = [];

  for (let level = 0; level < config.prebuiltLevels; level += 1) {
    slabs.push({
      level,
      axis: getAxisForLevel(level + 1),
      position: { x: 0, y: level * config.slabHeight, z: 0 },
      dimensions: {
        width: config.baseWidth,
        depth: config.baseDepth,
        height: config.slabHeight,
      },
      direction: 1,
    });
  }

  return slabs;
}

export function getTravelSpeed(level: number, config: DebugConfig): number {
  return config.motionSpeed + Math.max(0, level - 1) * config.speedRamp;
}

export function spawnActiveSlab(target: SlabData, config: DebugConfig): SlabData {
  const nextLevel = target.level + 1;
  const axis = getAxisForLevel(nextLevel);

  return {
    level: nextLevel,
    axis,
    position: {
      x: axis === "x" ? target.position.x - config.motionRange : target.position.x,
      y: target.position.y + config.slabHeight,
      z: axis === "z" ? target.position.z - config.motionRange : target.position.z,
    },
    dimensions: {
      width: target.dimensions.width,
      depth: target.dimensions.depth,
      height: config.slabHeight,
    },
    direction: 1,
  };
}

export function resolvePlacement(active: SlabData, target: SlabData, perfectTolerance: number): TrimResult {
  const axis = active.axis;
  const activeSize = axis === "x" ? active.dimensions.width : active.dimensions.depth;
  const targetSize = axis === "x" ? target.dimensions.width : target.dimensions.depth;
  const activeCenter = axis === "x" ? active.position.x : active.position.z;
  const targetCenter = axis === "x" ? target.position.x : target.position.z;
  const delta = activeCenter - targetCenter;
  const distance = Math.abs(delta);

  if (distance > activeSize) {
    return {
      outcome: "miss",
      landedSlab: null,
      debrisSlab: null,
      overlap: 0,
      trimmedSize: activeSize,
    };
  }

  if (distance <= perfectTolerance) {
    const snapped = cloneSlab(active, {
      position: {
        x: axis === "x" ? target.position.x : active.position.x,
        y: active.position.y,
        z: axis === "z" ? target.position.z : active.position.z,
      },
      dimensions: {
        ...active.dimensions,
        width: axis === "x" ? target.dimensions.width : active.dimensions.width,
        depth: axis === "z" ? target.dimensions.depth : active.dimensions.depth,
      },
    });

    return {
      outcome: "perfect",
      landedSlab: snapped,
      debrisSlab: null,
      overlap: targetSize,
      trimmedSize: 0,
    };
  }

  const overlap = targetSize - distance;
  if (overlap <= 0) {
    return {
      outcome: "miss",
      landedSlab: null,
      debrisSlab: null,
      overlap: 0,
      trimmedSize: activeSize,
    };
  }

  const trimmedSize = activeSize - overlap;
  const shift = delta / 2;
  const landedCenter = targetCenter + shift;
  const debrisDirection = Math.sign(delta) || 1;
  const debrisCenter = landedCenter + debrisDirection * (overlap / 2 + trimmedSize / 2);

  const landedSlab = cloneSlab(active, {
    position: {
      x: axis === "x" ? landedCenter : active.position.x,
      y: active.position.y,
      z: axis === "z" ? landedCenter : active.position.z,
    },
    dimensions: {
      ...active.dimensions,
      width: axis === "x" ? overlap : active.dimensions.width,
      depth: axis === "z" ? overlap : active.dimensions.depth,
    },
  });

  const debrisSlab = cloneSlab(active, {
    position: {
      x: axis === "x" ? debrisCenter : active.position.x,
      y: active.position.y,
      z: axis === "z" ? debrisCenter : active.position.z,
    },
    dimensions: {
      ...active.dimensions,
      width: axis === "x" ? trimmedSize : active.dimensions.width,
      depth: axis === "z" ? trimmedSize : active.dimensions.depth,
    },
  });

  return {
    outcome: "landed",
    landedSlab,
    debrisSlab,
    overlap,
    trimmedSize,
  };
}

function cloneSlab(slab: SlabData, overrides: Partial<SlabData>): SlabData {
  return {
    ...slab,
    ...overrides,
    position: {
      ...slab.position,
      ...overrides.position,
    },
    dimensions: {
      ...slab.dimensions,
      ...overrides.dimensions,
    },
  };
}
