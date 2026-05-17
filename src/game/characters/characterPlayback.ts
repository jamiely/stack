import { AnimationMixer, LoopPingPong, type AnimationClip } from "three";
import { resolveFallbackAnimationClips } from "./animationClipResolver";
import type { CharacterAnimationTargetBinding } from "./characterLoadCoordinator";

export interface CharacterPlaybackMixers {
  primaryMixer: AnimationMixer | null;
  secondaryMixer: AnimationMixer | null;
}

export interface CreateCharacterPlaybackOptions {
  targets: readonly CharacterAnimationTargetBinding[];
  resolvedClips: readonly (AnimationClip | null)[] | null;
  createMixer?: (model: CharacterAnimationTargetBinding["model"]) => AnimationMixerLike;
  resolveFallbackClips?: (targets: readonly CharacterAnimationTargetBinding[]) => readonly (AnimationClip | null)[];
}

export interface AnimationActionLike {
  reset(): void;
  setLoop(mode: number, repetitions: number): void;
  play(): void;
}

export interface AnimationMixerLike {
  clipAction(clip: AnimationClip): AnimationActionLike;
}

export function resolveCharacterPlaybackClips(
  targets: readonly CharacterAnimationTargetBinding[],
  resolvedClips: readonly (AnimationClip | null)[] | null,
  resolveFallbackClips: (targets: readonly CharacterAnimationTargetBinding[]) => readonly (AnimationClip | null)[] =
    resolveFallbackAnimationClips,
): readonly (AnimationClip | null)[] {
  return resolvedClips ?? resolveFallbackClips(targets);
}

export function createCharacterPlaybackMixers(options: CreateCharacterPlaybackOptions): CharacterPlaybackMixers {
  const clips = resolveCharacterPlaybackClips(
    options.targets,
    options.resolvedClips,
    options.resolveFallbackClips,
  );
  const createMixer = options.createMixer ?? ((model) => new AnimationMixer(model));

  let primaryMixer: AnimationMixer | null = null;
  let secondaryMixer: AnimationMixer | null = null;

  options.targets.forEach((target, index) => {
    const clip = clips[index];
    if (!clip) {
      return;
    }

    const mixer = createMixer(target.model);
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(LoopPingPong, Number.POSITIVE_INFINITY);
    action.play();

    if (target.role === "primary") {
      primaryMixer = mixer as AnimationMixer;
    } else if (target.role === "secondary") {
      secondaryMixer = mixer as AnimationMixer;
    }
  });

  return {
    primaryMixer,
    secondaryMixer,
  };
}
