import type { SlabData } from "../types";

export type IntegrityTier = "stable" | "precarious" | "unstable";

export interface IntegrityThresholds {
  precarious: number;
  unstable: number;
}

export interface CenterOfMass {
  x: number;
  z: number;
  totalMass: number;
}

export interface IntegrityTelemetry {
  centerOfMass: {
    x: number;
    z: number;
  };
  topCenter: {
    x: number;
    z: number;
  };
  offset: {
    x: number;
    z: number;
  };
  normalizedOffset: number;
  tier: IntegrityTier;
  wobbleStrength: number;
}

export function computeCenterOfMass(slabs: readonly SlabData[]): CenterOfMass {
  if (slabs.length === 0) {
    return { x: 0, z: 0, totalMass: 0 };
  }

  let totalMass = 0;
  let weightedX = 0;
  let weightedZ = 0;

  for (const slab of slabs) {
    const mass = Math.max(0.0001, slab.dimensions.width * slab.dimensions.depth * slab.dimensions.height);
    totalMass += mass;
    weightedX += slab.position.x * mass;
    weightedZ += slab.position.z * mass;
  }

  return {
    x: weightedX / totalMass,
    z: weightedZ / totalMass,
    totalMass,
  };
}

export function classifyIntegrity(normalizedOffset: number, thresholds: IntegrityThresholds): IntegrityTier {
  if (normalizedOffset >= thresholds.unstable) {
    return "unstable";
  }

  if (normalizedOffset >= thresholds.precarious) {
    return "precarious";
  }

  return "stable";
}

export function resolveIntegrityTelemetry(
  slabs: readonly SlabData[],
  thresholds: IntegrityThresholds,
  maxWobbleStrength: number,
): IntegrityTelemetry {
  if (slabs.length === 0) {
    return {
      centerOfMass: { x: 0, z: 0 },
      topCenter: { x: 0, z: 0 },
      offset: { x: 0, z: 0 },
      normalizedOffset: 0,
      tier: "stable",
      wobbleStrength: 0,
    };
  }

  const topSlab = slabs[slabs.length - 1]!;
  const centerOfMass = computeCenterOfMass(slabs);
  const offsetX = centerOfMass.x - topSlab.position.x;
  const offsetZ = centerOfMass.z - topSlab.position.z;
  const halfWidth = Math.max(0.0001, topSlab.dimensions.width / 2);
  const halfDepth = Math.max(0.0001, topSlab.dimensions.depth / 2);
  const normalizedOffset = Math.max(Math.abs(offsetX) / halfWidth, Math.abs(offsetZ) / halfDepth);
  const tier = classifyIntegrity(normalizedOffset, thresholds);

  const wobbleStrength =
    tier === "precarious"
      ? clamp01((normalizedOffset - thresholds.precarious) / Math.max(0.001, thresholds.unstable - thresholds.precarious)) *
        maxWobbleStrength
      : tier === "unstable"
        ? maxWobbleStrength
        : 0;

  return {
    centerOfMass: { x: centerOfMass.x, z: centerOfMass.z },
    topCenter: { x: topSlab.position.x, z: topSlab.position.z },
    offset: { x: offsetX, z: offsetZ },
    normalizedOffset,
    tier,
    wobbleStrength,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
