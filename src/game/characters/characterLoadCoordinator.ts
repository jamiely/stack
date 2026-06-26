import type { AnimationClip } from "three";
import { loadCharacterViewFromAsset, loadResolvedAnimationClipsForTargets } from "./characterAssetLoader";
import type {
  RemyAnimationAsset,
  RemyCharacterAsset,
  RemyCharacterId,
  RemyModelConfig,
} from "./contracts";
import type { BuiltCharacterView } from "./modelPreparation";

export type CharacterAnimationRole = "primary" | "secondary";

export interface CharacterAnimationTargetBinding {
  model: import("three").Object3D;
  role: CharacterAnimationRole;
  fallbackClips: readonly AnimationClip[];
}

export interface CharacterLoadCoordinatorResult {
  primarySetup: BuiltCharacterView;
  secondarySetup: BuiltCharacterView | null;
  animationTargets: readonly CharacterAnimationTargetBinding[];
  resolvedClips: readonly (AnimationClip | null)[] | null;
}

export interface LoadCharacterCoordinatorOptions {
  selectedCharacter: RemyCharacterAsset;
  secondaryCharacter: RemyCharacterAsset | null;
  animationCandidates: readonly RemyAnimationAsset[];
  getPreparationConfig: (characterId: RemyCharacterId) => RemyModelConfig["preparation"];
  loadCharacterView?: typeof loadCharacterViewFromAsset;
  loadResolvedAnimationClips?: typeof loadResolvedAnimationClipsForTargets;
}

export async function loadCharacterCoordinatorResult(
  options: LoadCharacterCoordinatorOptions,
): Promise<CharacterLoadCoordinatorResult | null> {
  const loadCharacterView = options.loadCharacterView ?? loadCharacterViewFromAsset;
  const loadResolvedAnimationClips = options.loadResolvedAnimationClips ?? loadResolvedAnimationClipsForTargets;

  const primaryPreparationConfig = options.getPreparationConfig(options.selectedCharacter.id);
  const primarySetup = await loadCharacterView(options.selectedCharacter.modelUrl, {
    characterId: options.selectedCharacter.id,
    nameSuffix: "primary",
    autoDetectUpAxis: primaryPreparationConfig.autoDetectUpAxis,
    rotationOffsetZ: primaryPreparationConfig.rotationOffsetZ,
    modelOffsetX: primaryPreparationConfig.modelOffsetX ?? 0,
  });

  if (!primarySetup) {
    return null;
  }

  let secondarySetup: BuiltCharacterView | null = null;
  if (options.secondaryCharacter) {
    try {
      const secondaryPreparationConfig = options.getPreparationConfig(options.secondaryCharacter.id);
      secondarySetup = await loadCharacterView(options.secondaryCharacter.modelUrl, {
        characterId: options.secondaryCharacter.id,
        nameSuffix: "secondary",
        autoDetectUpAxis: secondaryPreparationConfig.autoDetectUpAxis,
        rotationOffsetZ: secondaryPreparationConfig.rotationOffsetZ,
        modelOffsetX: secondaryPreparationConfig.modelOffsetX ?? 0,
      });
    } catch (error) {
      console.warn(`Failed to load secondary character model ${options.secondaryCharacter.id}.`, error);
    }
  }

  const animationTargets: CharacterAnimationTargetBinding[] = [
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
  ];

  const resolvedClips = await loadResolvedAnimationClips(animationTargets, options.animationCandidates);

  return {
    primarySetup,
    secondarySetup,
    animationTargets,
    resolvedClips,
  };
}
