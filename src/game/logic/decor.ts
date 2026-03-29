export interface WindowMetrics {
  windowHeight: number;
  windowWidth: number;
  frameDepth: number;
  frameThickness: number;
  sillHeight: number;
  sillDepth: number;
}

export interface SlabPosition2D {
  x: number;
  z: number;
}

export interface FaceRotationDescriptor {
  rotationY: number;
}

export const FACE_ROTATION = {
  posX: Math.PI / 2,
  negX: -Math.PI / 2,
  posZ: 0,
  negZ: Math.PI,
} as const;

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
  slabPosition: SlabPosition2D,
  cameraPosition: SlabPosition2D,
  rotationY: number,
): boolean {
  const toCameraX = cameraPosition.x - slabPosition.x;
  const toCameraZ = cameraPosition.z - slabPosition.z;
  const normalX = Math.sin(rotationY);
  const normalZ = Math.cos(rotationY);
  return normalX * toCameraX + normalZ * toCameraZ <= 0;
}

export function filterFacesByVisibility<T extends FaceRotationDescriptor>(
  faces: readonly T[],
  slabPosition: SlabPosition2D,
  cameraPosition: SlabPosition2D,
  visibility: "visible" | "hidden",
): T[] {
  return faces.filter((face) => {
    const hidden = isFaceHiddenFromCamera(slabPosition, cameraPosition, face.rotationY);
    return visibility === "hidden" ? hidden : !hidden;
  });
}

export function shouldUseDarkWindowTrim(level: number): boolean {
  return sampleDecorNoise(level * 0.97 + 3.7, 12.61) < 0.34;
}

export function resolveWindowShutterPalette(level: number): "slate" | "teal" | "plum" | "sand" {
  const noise = sampleDecorNoise(level * 1.41 + 6.12, 14.07);
  if (noise < 0.25) {
    return "slate";
  }
  if (noise < 0.5) {
    return "teal";
  }
  if (noise < 0.75) {
    return "plum";
  }
  return "sand";
}

export function shouldRenderWeathering(noise: number, threshold = 0.16): boolean {
  return noise > threshold;
}

export function resolveSlabHue(level: number): number {
  return (42 + level * 31) % 360;
}
