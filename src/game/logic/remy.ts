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
