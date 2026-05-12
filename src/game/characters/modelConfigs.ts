import type { RemyCharacterAsset, RemyCharacterId, RemyDebugConfig, RemyModelConfig } from "./contracts";

export const REMY_LEGACY_DEBUG_DEFAULTS: RemyDebugConfig = {
  yawDegrees: -9,
  pitchDegrees: -7,
  rollDegrees: 89,
  translateX: 0,
  translateY: 0.85,
  translateZ: 0,
};

export const REMY_TIMMY_DEBUG_DEFAULTS: RemyDebugConfig = {
  yawDegrees: -180,
  pitchDegrees: 180,
  rollDegrees: 180,
  translateX: 0,
  translateY: 0.85,
  translateZ: 0,
};

export const REMY_AMY_DEBUG_DEFAULTS: RemyDebugConfig = {
  yawDegrees: -180,
  pitchDegrees: 180,
  rollDegrees: 180,
  translateX: 0,
  translateY: 0.85,
  translateZ: 0,
};

export const REMY_AJ_DEBUG_DEFAULTS: RemyDebugConfig = {
  yawDegrees: -180,
  pitchDegrees: 180,
  rollDegrees: 180,
  translateX: 0,
  translateY: 0.85,
  translateZ: 0,
};

export const REMY_CHARACTER_MODEL_CONFIGS = {
  remy: {
    debugDefaults: REMY_LEGACY_DEBUG_DEFAULTS,
  },
  timmy: {
    debugDefaults: REMY_TIMMY_DEBUG_DEFAULTS,
  },
  amy: {
    debugDefaults: REMY_AMY_DEBUG_DEFAULTS,
  },
  aj: {
    debugDefaults: REMY_AJ_DEBUG_DEFAULTS,
  },
} satisfies Record<RemyCharacterId, RemyModelConfig>;

export const REMY_TEST_MODE_DEBUG_DEFAULTS: RemyDebugConfig = { ...REMY_LEGACY_DEBUG_DEFAULTS };

export const REMY_CHARACTER_ASSETS: readonly RemyCharacterAsset[] = [
  { id: "remy", modelUrl: new URL("../../../assets/remy_character_t_pose.glb", import.meta.url).href },
  { id: "timmy", modelUrl: new URL("../../../assets/timmy_tiny_webp.glb", import.meta.url).href },
  { id: "amy", modelUrl: new URL("../../../assets/amy_tiny_webp.glb", import.meta.url).href },
  { id: "aj", modelUrl: new URL("../../../assets/aj_tiny_webp.glb", import.meta.url).href },
];

export function getRemyModelConfig(characterId: RemyCharacterId): RemyModelConfig {
  return REMY_CHARACTER_MODEL_CONFIGS[characterId];
}

export function getRemyDebugDefaults(
  characterId: RemyCharacterId | null | undefined,
  options: { testMode?: boolean } = {},
): RemyDebugConfig {
  if (options.testMode) {
    return { ...REMY_TEST_MODE_DEBUG_DEFAULTS };
  }

  if (characterId) {
    return { ...getRemyModelConfig(characterId).debugDefaults };
  }

  return { ...REMY_LEGACY_DEBUG_DEFAULTS };
}
