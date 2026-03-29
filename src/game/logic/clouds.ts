export interface CloudProjectedPoint {
  x: number;
  y: number;
  z: number;
}

export function shouldRespawnCloud(projected: CloudProjectedPoint): boolean {
  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y) || !Number.isFinite(projected.z)) {
    return true;
  }

  const offBottom = projected.y > 1.25;
  const behindCamera = projected.z > 1.1;
  return offBottom || behindCamera;
}

export function resolveCloudSpawnNdcX(noise: number): number {
  const clampedNoise = clamp(noise, 0, 1);
  return -0.95 + clampedNoise * 1.9;
}

export function resolveCloudVerticalVelocity(noise: number, spawnFromTop: boolean): number {
  const clampedNoise = clamp(noise, 0, 1);
  if (!spawnFromTop) {
    return 0;
  }

  const baseDrift = 1.8;
  const variance = 1.1;
  return baseDrift + clampedNoise * variance;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
