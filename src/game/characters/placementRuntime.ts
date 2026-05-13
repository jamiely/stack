import type { RemyDebugConfig } from "./contracts";
import {
  REMY_FALLBACK_POSE_PRESET,
  REMY_SIDE_POSE_PRESETS,
  type CharacterFaceId,
} from "./modelConfigs";

export interface ResolveDualCharacterLaneOffsetsOptions {
  usableWidth: number;
  useDualCharacters: boolean;
  edgePadding: number;
  spreadRatio: number;
  minSpread: number;
}

export function readCharacterFaceId(faceId: unknown): CharacterFaceId | null {
  if (faceId === "posX" || faceId === "negX" || faceId === "posZ" || faceId === "negZ") {
    return faceId;
  }

  return null;
}

export function resolveCharacterSidePose(faceId: CharacterFaceId | null): RemyDebugConfig {
  if (!faceId) {
    return REMY_FALLBACK_POSE_PRESET;
  }

  return REMY_SIDE_POSE_PRESETS[faceId];
}

export function resolveDualCharacterLaneOffsets(options: ResolveDualCharacterLaneOffsetsOptions): number[] {
  if (!options.useDualCharacters) {
    return [0];
  }

  const usableWidth = Number.isFinite(options.usableWidth)
    ? Math.max(0, options.usableWidth)
    : 0;
  const maxSpread = Math.max(0, usableWidth / 2 - options.edgePadding);
  if (maxSpread <= 0) {
    return [0];
  }

  const desiredSpread = Math.max(options.minSpread, usableWidth * options.spreadRatio);
  const spread = Math.min(maxSpread, desiredSpread);
  return [-spread, spread];
}
