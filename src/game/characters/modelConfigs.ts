import type {
  RemyAnimationAsset,
  RemyCharacterAsset,
  RemyCharacterId,
  RemyDebugConfig,
  RemyDebugKey,
  RemyModelConfig,
} from "./contracts";

export type CharacterFaceId = "posX" | "negX" | "posZ" | "negZ";

export const REMY_LEGACY_DEBUG_DEFAULTS: RemyDebugConfig = {
  yawDegrees: -9,
  pitchDegrees: -7,
  rollDegrees: 89,
  translateX: 0,
  translateY: 0,
  translateZ: 0,
};

export const REMY_TIMMY_DEBUG_DEFAULTS: RemyDebugConfig = {
  yawDegrees: -180,
  pitchDegrees: 180,
  rollDegrees: 180,
  translateX: 0,
  translateY: 0,
  translateZ: 0,
};

export const REMY_AMY_DEBUG_DEFAULTS: RemyDebugConfig = {
  yawDegrees: -180,
  pitchDegrees: 180,
  rollDegrees: 180,
  translateX: 0,
  translateY: 0,
  translateZ: 0,
};

export const REMY_AJ_DEBUG_DEFAULTS: RemyDebugConfig = {
  yawDegrees: -180,
  pitchDegrees: 180,
  rollDegrees: 180,
  translateX: 0,
  translateY: 0,
  translateZ: 0,
};

const DEFAULT_REMY_PREPARATION_CONFIG = {
  autoDetectUpAxis: true,
  rotationOffsetZ: 0,
} as const;

const DEFAULT_REMY_PLACEMENT_CONFIG = {
  targetHeightRatio: 0.42,
  minHeight: 0.54,
  maxHeight: 1.28,
  ledgeClearance: -0.15,
  ledgeInsetRatio: 0.45,
  wallClearance: 0.01,
  rotationOffsetY: 0,
} as const;

export const REMY_CHARACTER_MODEL_CONFIGS = {
  remy: {
    debugDefaults: REMY_LEGACY_DEBUG_DEFAULTS,
    preparation: DEFAULT_REMY_PREPARATION_CONFIG,
    placement: DEFAULT_REMY_PLACEMENT_CONFIG,
  },
  timmy: {
    debugDefaults: REMY_TIMMY_DEBUG_DEFAULTS,
    preparation: DEFAULT_REMY_PREPARATION_CONFIG,
    placement: DEFAULT_REMY_PLACEMENT_CONFIG,
  },
  amy: {
    debugDefaults: REMY_AMY_DEBUG_DEFAULTS,
    preparation: DEFAULT_REMY_PREPARATION_CONFIG,
    placement: DEFAULT_REMY_PLACEMENT_CONFIG,
  },
  aj: {
    debugDefaults: REMY_AJ_DEBUG_DEFAULTS,
    preparation: DEFAULT_REMY_PREPARATION_CONFIG,
    placement: DEFAULT_REMY_PLACEMENT_CONFIG,
  },
} satisfies Record<RemyCharacterId, RemyModelConfig>;

export const REMY_TEST_MODE_DEBUG_DEFAULTS: RemyDebugConfig = { ...REMY_LEGACY_DEBUG_DEFAULTS };

export const REMY_CHARACTER_ASSETS: readonly RemyCharacterAsset[] = [
  { id: "remy", modelUrl: new URL("../../../assets/remy_character_t_pose.glb", import.meta.url).href },
  { id: "timmy", modelUrl: new URL("../../../assets/timmy_tiny_webp.glb", import.meta.url).href },
  { id: "amy", modelUrl: new URL("../../../assets/amy_tiny_webp.glb", import.meta.url).href },
  { id: "aj", modelUrl: new URL("../../../assets/aj_tiny_webp.glb", import.meta.url).href },
];

export const REMY_ANIMATION_ASSETS: readonly RemyAnimationAsset[] = [
  { id: "hip-hop", animationUrl: new URL("../../../assets/remy_hip_hop_animation_inplace.glb", import.meta.url).href },
  { id: "house", animationUrl: new URL("../../../assets/house_dancing_inplace.glb", import.meta.url).href },
  { id: "chicken", animationUrl: new URL("../../../assets/chicken_dance_inplace.glb", import.meta.url).href },
  { id: "ymca", animationUrl: new URL("../../../assets/ymca_dance_inplace.glb", import.meta.url).href },
];

export const REMY_DEBUG_RANGES: Record<RemyDebugKey, { min: number; max: number; step: number; label: string; suffix?: string }> = {
  yawDegrees: { min: -180, max: 180, step: 1, label: "Remy Rot Y", suffix: "°" },
  pitchDegrees: { min: -180, max: 180, step: 1, label: "Remy Rot X", suffix: "°" },
  rollDegrees: { min: -180, max: 180, step: 1, label: "Remy Rot Z", suffix: "°" },
  translateX: { min: -2, max: 2, step: 0.01, label: "Remy Move X" },
  translateY: { min: -2, max: 2, step: 0.01, label: "Remy Move Y" },
  translateZ: { min: -2, max: 2, step: 0.01, label: "Remy Move Z" },
};

export const REMY_SIDE_POSE_PRESETS: Record<CharacterFaceId, RemyDebugConfig> = {
  posX: { pitchDegrees: 0, yawDegrees: 0, rollDegrees: 0, translateX: 0, translateY: 0, translateZ: 0 },
  negX: { pitchDegrees: 0, yawDegrees: 0, rollDegrees: 0, translateX: 0, translateY: 0, translateZ: 0 },
  posZ: { pitchDegrees: 0, yawDegrees: 0, rollDegrees: 0, translateX: 0, translateY: 0, translateZ: 0 },
  negZ: { pitchDegrees: 0, yawDegrees: 0, rollDegrees: 0, translateX: 0, translateY: 0, translateZ: 0 },
};

export const REMY_FALLBACK_POSE_PRESET: RemyDebugConfig = {
  pitchDegrees: 0,
  yawDegrees: 0,
  rollDegrees: 0,
  translateX: 0,
  translateY: 0,
  translateZ: 0,
};

export function getRemyModelConfig(characterId: RemyCharacterId): RemyModelConfig {
  return REMY_CHARACTER_MODEL_CONFIGS[characterId];
}

export function getRemyDebugDefaults(
  characterId: RemyCharacterId | null | undefined,
  options: { testMode?: boolean } = {},
): RemyDebugConfig {
  if (options.testMode && !characterId) {
    return { ...REMY_TEST_MODE_DEBUG_DEFAULTS };
  }

  if (characterId) {
    return { ...getRemyModelConfig(characterId).debugDefaults };
  }

  return { ...REMY_LEGACY_DEBUG_DEFAULTS };
}
