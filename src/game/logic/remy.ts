export interface RemyAnchorVisibility {
  hasAnchor: boolean;
  hasLedge: boolean;
  slabMeshAttached: boolean;
  slabNearScreen: boolean;
  anchorFaceVisible: boolean;
}

export interface TentacleBurstMarker {
  slabLevel: number;
  faceNoiseSalt: number;
  createdAtSeconds: number;
}

export interface TentacleSpawnCheck {
  placementNoise: number;
  burstChance: number;
}

export const REMY_DUAL_SPAWN_WIDTH_RATIO = 0.75;

export function shouldKeepCurrentRemyAnchor(visibility: RemyAnchorVisibility): boolean {
  return (
    visibility.hasAnchor &&
    visibility.hasLedge &&
    visibility.slabMeshAttached &&
    visibility.slabNearScreen &&
    visibility.anchorFaceVisible
  );
}

export function hasRecentTentacleBurstOnFace(
  bursts: readonly TentacleBurstMarker[],
  slabLevel: number,
  faceNoiseSalt: number,
  elapsedSeconds: number,
  suppressionWindowSeconds: number,
): boolean {
  const safeWindow = Math.max(0, suppressionWindowSeconds);

  return bursts.some((burst) => {
    if (burst.slabLevel !== slabLevel || burst.faceNoiseSalt !== faceNoiseSalt) {
      return false;
    }

    const burstAgeSeconds = elapsedSeconds - burst.createdAtSeconds;
    return burstAgeSeconds >= 0 && burstAgeSeconds <= safeWindow;
  });
}

export function shouldSpawnTentacleBurst(check: TentacleSpawnCheck): boolean {
  const burstChance = Math.min(1, Math.max(0, check.burstChance));
  const placementNoise = Number.isFinite(check.placementNoise)
    ? Math.min(1, Math.max(0, check.placementNoise))
    : 1;
  return placementNoise < burstChance;
}

export function shouldSpawnDualRemyCharacters(widthRatio: number, threshold = REMY_DUAL_SPAWN_WIDTH_RATIO): boolean {
  if (!Number.isFinite(widthRatio) || !Number.isFinite(threshold)) {
    return false;
  }

  return widthRatio >= threshold;
}

export function pickNonRepeatingIndex(
  count: number,
  randomValue: number,
  previousIndex: number | null,
): number {
  const safeCount = Math.max(1, Math.floor(count));
  const normalizedRandom = Number.isFinite(randomValue)
    ? Math.min(0.999999, Math.max(0, randomValue))
    : 0;

  if (
    safeCount <= 1 ||
    previousIndex === null ||
    previousIndex < 0 ||
    previousIndex >= safeCount
  ) {
    return Math.floor(normalizedRandom * safeCount);
  }

  const choice = Math.floor(normalizedRandom * (safeCount - 1));
  return choice >= previousIndex ? choice + 1 : choice;
}
