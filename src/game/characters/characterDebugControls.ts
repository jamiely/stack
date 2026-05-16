import type { RemyCharacterId, RemyDebugConfig, RemyDebugKey } from "./contracts";
import { REMY_DEBUG_RANGES, getRemyDebugDefaults } from "./modelConfigs";

export interface RemyDebugInputLike {
  dataset: {
    remyDebugKey?: string;
  };
  value: string;
}

export interface RemyDebugValueLabelLike {
  dataset: {
    remyDebugValue?: string;
  };
  textContent: string | null;
}

export function resolveBaseRemyDebugConfig(
  characterId: RemyCharacterId | null | undefined,
  options: { testMode: boolean },
): RemyDebugConfig {
  return getRemyDebugDefaults(characterId, { testMode: options.testMode });
}

export function resolveStoredRemyDebugConfig(options: {
  characterId: RemyCharacterId | null | undefined;
  storedConfigs: ReadonlyMap<RemyCharacterId, RemyDebugConfig>;
  testMode: boolean;
}): RemyDebugConfig {
  const { characterId, storedConfigs, testMode } = options;
  if (characterId) {
    const storedConfig = storedConfigs.get(characterId);
    if (storedConfig) {
      return { ...storedConfig };
    }
  }

  return resolveBaseRemyDebugConfig(characterId, { testMode });
}

export function applyRemyDebugConfigPatch(options: {
  currentConfig: RemyDebugConfig;
  patch: Partial<RemyDebugConfig>;
  activeCharacterId: RemyCharacterId | null;
  storedConfigs: ReadonlyMap<RemyCharacterId, RemyDebugConfig>;
}): { nextConfig: RemyDebugConfig; nextStoredConfigs: Map<RemyCharacterId, RemyDebugConfig> } {
  const nextConfig = {
    ...options.currentConfig,
    ...options.patch,
  };

  const nextStoredConfigs = new Map(options.storedConfigs);
  if (options.activeCharacterId) {
    nextStoredConfigs.set(options.activeCharacterId, { ...nextConfig });
  }

  return {
    nextConfig,
    nextStoredConfigs,
  };
}

export function syncRemyDebugInputValues(
  inputs: Iterable<RemyDebugInputLike>,
  config: RemyDebugConfig,
): void {
  for (const input of inputs) {
    const key = input.dataset.remyDebugKey as RemyDebugKey | undefined;
    if (!key) {
      continue;
    }

    input.value = String(config[key]);
  }
}

export function syncRemyDebugValueLabels(
  labels: Iterable<RemyDebugValueLabelLike>,
  config: RemyDebugConfig,
): void {
  for (const label of labels) {
    const key = label.dataset.remyDebugValue as RemyDebugKey | undefined;
    if (!key) {
      continue;
    }

    const value = config[key];
    const suffix = REMY_DEBUG_RANGES[key].suffix ?? "";
    label.textContent = `${value.toFixed(2)}${suffix}`;
  }
}
