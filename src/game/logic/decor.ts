export interface WindowMetrics {
  windowHeight: number;
  windowWidth: number;
  frameDepth: number;
  frameThickness: number;
  sillHeight: number;
  sillDepth: number;
}

export function sampleDecorNoise(level: number, salt: number): number {
  const value = Math.sin(level * 12.9898 + salt * 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

export function resolveWindowMetrics(slabHeight: number): WindowMetrics {
  const windowHeight = Math.max(0.5, Math.min(0.92, slabHeight * 0.36));
  const windowWidth = Math.max(0.16, windowHeight * 0.42);
  const frameDepth = Math.max(0.045, Math.min(0.08, windowWidth * 0.3));
  const frameThickness = Math.max(0.03, Math.min(0.09, windowWidth * 0.2));

  return {
    windowHeight,
    windowWidth,
    frameDepth,
    frameThickness,
    sillHeight: Math.max(0.03, frameThickness * 0.6),
    sillDepth: frameDepth * 1.9,
  };
}

export function isFaceHiddenFromCamera(
  slabPosition: { x: number; z: number },
  cameraPosition: { x: number; z: number },
  rotationY: number,
): boolean {
  const toCameraX = cameraPosition.x - slabPosition.x;
  const toCameraZ = cameraPosition.z - slabPosition.z;
  const normalX = Math.sin(rotationY);
  const normalZ = Math.cos(rotationY);
  return normalX * toCameraX + normalZ * toCameraZ <= 0;
}

export function shouldRenderWeathering(noise: number, threshold = 0.16): boolean {
  return noise > threshold;
}

export function resolveSlabHue(level: number): number {
  return (42 + level * 31) % 360;
}
