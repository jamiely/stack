export function sampleTremorCameraShake(elapsedSeconds: number, tremorStrength: number): { x: number; y: number } {
  if (tremorStrength <= 0) {
    return { x: 0, y: 0 };
  }

  const shakePhase = elapsedSeconds * 58;
  return {
    x: Math.sin(shakePhase) * 0.03 * tremorStrength,
    y: Math.cos(shakePhase * 0.9) * 0.04 * tremorStrength,
  };
}

export function samplePlacementCameraShake(
  elapsedSeconds: number,
  remainingSeconds: number,
  durationSeconds: number,
  amount: number,
): { x: number; y: number; z: number } {
  if (remainingSeconds <= 0 || durationSeconds <= 0 || amount <= 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const shakeStrength = (remainingSeconds / durationSeconds) * amount;
  const shakePhase = elapsedSeconds * 78;
  return {
    x: Math.sin(shakePhase) * 0.08 * shakeStrength,
    y: Math.cos(shakePhase * 1.1) * 0.06 * shakeStrength,
    z: Math.sin(shakePhase * 0.9) * 0.04 * shakeStrength,
  };
}
