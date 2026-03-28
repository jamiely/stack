export type QualityPreset = "low" | "medium" | "high";
export type DistractionLodTier = "high" | "medium" | "low";

export interface QualityScalars {
  keepRecentMultiplier: number;
  chunkSizeMultiplier: number;
  lodDistanceMultiplier: number;
  maxDebrisMultiplier: number;
  distractionUpdateStride: number;
  pixelRatioCap: number;
}

const QUALITY_ORDER: QualityPreset[] = ["low", "medium", "high"];

const QUALITY_SCALARS: Record<QualityPreset, QualityScalars> = {
  low: {
    keepRecentMultiplier: 0.65,
    chunkSizeMultiplier: 1.45,
    lodDistanceMultiplier: 0.72,
    maxDebrisMultiplier: 0.55,
    distractionUpdateStride: 3,
    pixelRatioCap: 1,
  },
  medium: {
    keepRecentMultiplier: 0.82,
    chunkSizeMultiplier: 1.2,
    lodDistanceMultiplier: 0.86,
    maxDebrisMultiplier: 0.75,
    distractionUpdateStride: 2,
    pixelRatioCap: 1.5,
  },
  high: {
    keepRecentMultiplier: 1,
    chunkSizeMultiplier: 1,
    lodDistanceMultiplier: 1,
    maxDebrisMultiplier: 1,
    distractionUpdateStride: 1,
    pixelRatioCap: 2,
  },
};

export function toQualityPreset(value: number): QualityPreset {
  if (value <= 0) {
    return "low";
  }

  if (value >= 2) {
    return "high";
  }

  return "medium";
}

export function getQualityScalars(preset: QualityPreset): QualityScalars {
  return QUALITY_SCALARS[preset];
}

export function resolveAdaptiveQualityPreset(
  current: QualityPreset,
  requested: QualityPreset,
  autoEnabled: boolean,
  averageFrameTimeMs: number,
  budgetMs: number,
): QualityPreset {
  if (!autoEnabled) {
    return requested;
  }

  const requestedIndex = QUALITY_ORDER.indexOf(requested);
  const currentIndex = QUALITY_ORDER.indexOf(current);

  let targetIndex = requestedIndex;

  if (averageFrameTimeMs > budgetMs * 1.35) {
    targetIndex = Math.max(0, requestedIndex - 2);
  } else if (averageFrameTimeMs > budgetMs * 1.15) {
    targetIndex = Math.max(0, requestedIndex - 1);
  }

  if (targetIndex < currentIndex) {
    return QUALITY_ORDER[targetIndex];
  }

  if (targetIndex > currentIndex && averageFrameTimeMs < budgetMs * 0.9) {
    return QUALITY_ORDER[Math.min(targetIndex, currentIndex + 1)];
  }

  return current;
}

export function isSlabArchivable(level: number, topLevel: number, keepRecentLevels: number): boolean {
  if (keepRecentLevels <= 0) {
    return true;
  }

  return level <= topLevel - keepRecentLevels;
}

export function collectArchivableLevels(levels: readonly number[], topLevel: number, keepRecentLevels: number): number[] {
  return levels.filter((level) => isSlabArchivable(level, topLevel, keepRecentLevels));
}

export function selectDistractionLodTier(
  distanceFromFocus: number,
  nearDistance: number,
  farDistance: number,
): DistractionLodTier {
  const distance = Math.max(0, distanceFromFocus);
  const near = Math.max(0, Math.min(nearDistance, farDistance));
  const far = Math.max(near, farDistance);

  if (distance <= near) {
    return "high";
  }

  if (distance <= far) {
    return "medium";
  }

  return "low";
}

export function shouldUpdateForLod(lod: DistractionLodTier, frameCounter: number, strideHint: number): boolean {
  const clampedStride = Math.max(1, Math.floor(strideHint));

  if (lod === "high") {
    return true;
  }

  if (lod === "medium") {
    return frameCounter % Math.max(1, clampedStride) === 0;
  }

  return frameCounter % Math.max(1, clampedStride * 2) === 0;
}
