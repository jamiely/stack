import { AnimationClip, Group } from "three";
import { describe, expect, it, vi } from "vitest";
import {
  createResetCharacterRuntimeState,
  prepareLoadedCharacterRuntimeState,
} from "../../src/game/characters/characterLoadRuntimeState";
import type { CharacterLoadCoordinatorResult } from "../../src/game/characters/characterLoadCoordinator";
import type { CharacterView, RemyDebugConfig } from "../../src/game/characters/contracts";
import type { BuiltCharacterView } from "../../src/game/characters/modelPreparation";

function buildView(label: string): CharacterView {
  const animationTarget = new Group();
  animationTarget.name = `${label}-target`;

  return {
    sceneNodes: {
      characterRoot: new Group(),
      placementNode: new Group(),
      facingNode: new Group(),
      scaleNode: new Group(),
      correctionNode: new Group(),
      poseRotateX: new Group(),
      poseRotateY: new Group(),
      poseRotateZ: new Group(),
      animationTarget,
    },
    animationTarget,
    baseHeight: 1,
    baseDepth: 1,
    applyPlacement: () => undefined,
    attachTo: () => undefined,
    detach: () => undefined,
  };
}

function buildSetup(label: string): BuiltCharacterView {
  return {
    view: buildView(label),
    animations: [new AnimationClip(`${label}-fallback`, 1, [])],
  };
}

function buildLoadResult(includeSecondary = true): CharacterLoadCoordinatorResult {
  const primarySetup = buildSetup("primary");
  const secondarySetup = includeSecondary ? buildSetup("secondary") : null;

  return {
    primarySetup,
    secondarySetup,
    animationTargets: [
      {
        model: primarySetup.view.animationTarget,
        role: "primary",
        fallbackClips: primarySetup.animations,
      },
      ...(secondarySetup
        ? [
            {
              model: secondarySetup.view.animationTarget,
              role: "secondary" as const,
              fallbackClips: secondarySetup.animations,
            },
          ]
        : []),
    ],
    resolvedClips: [new AnimationClip("resolved-primary", 1, []), new AnimationClip("resolved-secondary", 1, [])],
  };
}

describe("characterLoadRuntimeState", () => {
  it("prepares views, active ids, stored debug config, and playback mixers from a load result", () => {
    const loadResult = buildLoadResult(true);
    const storedDebugConfig: RemyDebugConfig = {
      yawDegrees: 12,
      pitchDegrees: -4,
      rollDegrees: 6,
      translateX: 0.2,
      translateY: -0.1,
      translateZ: 0.4,
    };
    const createPlaybackMixers = vi.fn().mockReturnValue({
      primaryMixer: { id: "primary-mixer" },
      secondaryMixer: { id: "secondary-mixer" },
    });

    const result = prepareLoadedCharacterRuntimeState({
      loadResult,
      selectedCharacterId: "amy",
      secondaryCharacterId: "timmy",
      storedDebugConfigs: new Map([["amy", storedDebugConfig]]),
      testMode: false,
      createPlaybackMixers,
    });

    expect(result.primaryView).toBe(loadResult.primarySetup.view);
    expect(result.secondaryView).toBe(loadResult.secondarySetup?.view ?? null);
    expect(result.activeCharacterId).toBe("amy");
    expect(result.activeSecondaryCharacterId).toBe("timmy");
    expect(result.debugConfig).toEqual(storedDebugConfig);
    expect(result.debugConfig).not.toBe(storedDebugConfig);
    expect(result.primaryMixer).toEqual({ id: "primary-mixer" });
    expect(result.secondaryMixer).toEqual({ id: "secondary-mixer" });
    expect(createPlaybackMixers).toHaveBeenCalledWith({
      targets: loadResult.animationTargets,
      resolvedClips: loadResult.resolvedClips,
    });
  });

  it("clears the secondary id when the secondary setup is unavailable", () => {
    const loadResult = buildLoadResult(false);

    const result = prepareLoadedCharacterRuntimeState({
      loadResult,
      selectedCharacterId: "remy",
      secondaryCharacterId: "timmy",
      storedDebugConfigs: new Map(),
      testMode: false,
      createPlaybackMixers: () => ({
        primaryMixer: null,
        secondaryMixer: null,
      }),
    });

    expect(result.secondaryView).toBeNull();
    expect(result.activeSecondaryCharacterId).toBeNull();
  });

  it("creates a reset state for clearing stale loaded character runtime handles", () => {
    expect(createResetCharacterRuntimeState({ currentLoadGeneration: 8 })).toEqual({
      loadGeneration: 9,
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
    });
  });
});
