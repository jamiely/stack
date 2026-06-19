import { resolveStoredRemyDebugConfig } from "./characterDebugControls";
import {
  createCharacterPlaybackMixers,
  type CreateCharacterPlaybackOptions,
  type CharacterPlaybackMixers,
} from "./characterPlayback";
import type { CharacterLoadCoordinatorResult } from "./characterLoadCoordinator";
import type { CharacterView, RemyCharacterId, RemyDebugConfig } from "./contracts";

export interface PrepareLoadedCharacterRuntimeStateOptions {
  loadResult: CharacterLoadCoordinatorResult;
  selectedCharacterId: RemyCharacterId;
  secondaryCharacterId: RemyCharacterId | null;
  storedDebugConfigs: ReadonlyMap<RemyCharacterId, RemyDebugConfig>;
  testMode: boolean;
  createPlaybackMixers?: (options: CreateCharacterPlaybackOptions) => CharacterPlaybackMixers;
}

export interface LoadedCharacterRuntimeState {
  primaryView: CharacterView;
  secondaryView: CharacterView | null;
  activeCharacterId: RemyCharacterId;
  activeSecondaryCharacterId: RemyCharacterId | null;
  debugConfig: RemyDebugConfig;
  primaryMixer: CharacterPlaybackMixers["primaryMixer"];
  secondaryMixer: CharacterPlaybackMixers["secondaryMixer"];
}

export interface ResetCharacterRuntimeStateOptions {
  currentLoadGeneration: number;
}

export interface ResetCharacterRuntimeState {
  loadGeneration: number;
  isLoading: false;
  refreshPending: false;
  appearanceRefreshPending: false;
  primaryView: null;
  secondaryView: null;
  activeCharacterId: null;
  activeSecondaryCharacterId: null;
  primaryMixer: null;
  secondaryMixer: null;
  anchor: null;
  suppressedByTentacles: false;
}

export function createResetCharacterRuntimeState(
  options: ResetCharacterRuntimeStateOptions,
): ResetCharacterRuntimeState {
  return {
    loadGeneration: options.currentLoadGeneration + 1,
    isLoading: false,
    refreshPending: false,
    appearanceRefreshPending: false,
    primaryView: null,
    secondaryView: null,
    activeCharacterId: null,
    activeSecondaryCharacterId: null,
    primaryMixer: null,
    secondaryMixer: null,
    anchor: null,
    suppressedByTentacles: false,
  };
}

export function prepareLoadedCharacterRuntimeState(
  options: PrepareLoadedCharacterRuntimeStateOptions,
): LoadedCharacterRuntimeState {
  const createPlayback = options.createPlaybackMixers ?? createCharacterPlaybackMixers;
  const playbackMixers = createPlayback({
    targets: options.loadResult.animationTargets,
    resolvedClips: options.loadResult.resolvedClips,
  });

  return {
    primaryView: options.loadResult.primarySetup.view,
    secondaryView: options.loadResult.secondarySetup?.view ?? null,
    activeCharacterId: options.selectedCharacterId,
    activeSecondaryCharacterId: options.loadResult.secondarySetup ? options.secondaryCharacterId : null,
    debugConfig: resolveStoredRemyDebugConfig({
      characterId: options.selectedCharacterId,
      storedConfigs: options.storedDebugConfigs,
      testMode: options.testMode,
    }),
    primaryMixer: playbackMixers.primaryMixer,
    secondaryMixer: playbackMixers.secondaryMixer,
  };
}
