import { AnimationClip, Group, LoopPingPong, type Object3D } from "three";
import { describe, expect, it, vi } from "vitest";
import {
  createCharacterPlaybackMixers,
  resolveCharacterPlaybackClips,
} from "../../src/game/characters/characterPlayback";
import type { CharacterAnimationTargetBinding } from "../../src/game/characters/characterLoadCoordinator";

function buildTarget(role: CharacterAnimationTargetBinding["role"], fallbackClipName: string): CharacterAnimationTargetBinding {
  return {
    model: new Group(),
    role,
    fallbackClips: [new AnimationClip(fallbackClipName, 1, [])],
  };
}

describe("characterPlayback", () => {
  it("uses resolved clips when available and wires mixers by role", () => {
    const targets = [buildTarget("primary", "primary-fallback"), buildTarget("secondary", "secondary-fallback")];
    const clips = [new AnimationClip("primary-resolved", 1, []), new AnimationClip("secondary-resolved", 1, [])] as const;
    const actions = clips.map(() => ({
      reset: vi.fn(),
      setLoop: vi.fn(),
      play: vi.fn(),
    }));
    const mixers = actions.map((action) => ({
      clipAction: vi.fn().mockReturnValue(action),
    }));
    const createMixerCalls: Object3D[] = [];
    const createMixer = (model: Object3D) => {
      createMixerCalls.push(model);
      return mixers[createMixerCalls.length - 1];
    };

    const result = createCharacterPlaybackMixers({
      targets,
      resolvedClips: clips,
      createMixer,
    });

    expect(createMixerCalls).toHaveLength(2);
    expect(mixers[0].clipAction).toHaveBeenCalledWith(clips[0]);
    expect(mixers[1].clipAction).toHaveBeenCalledWith(clips[1]);
    expect(actions[0].reset).toHaveBeenCalledOnce();
    expect(actions[0].setLoop).toHaveBeenCalledWith(LoopPingPong, Number.POSITIVE_INFINITY);
    expect(actions[0].play).toHaveBeenCalledOnce();
    expect(actions[1].reset).toHaveBeenCalledOnce();
    expect(actions[1].setLoop).toHaveBeenCalledWith(LoopPingPong, Number.POSITIVE_INFINITY);
    expect(actions[1].play).toHaveBeenCalledOnce();
    expect(result).toEqual({
      primaryMixer: mixers[0],
      secondaryMixer: mixers[1],
    });
  });

  it("falls back to per-target clips when resolved clips are unavailable", () => {
    const targets = [buildTarget("primary", "fallback-primary"), buildTarget("secondary", "fallback-secondary")];

    const fallbackClips = resolveCharacterPlaybackClips(
      targets,
      null,
      () => targets.map((target) => target.fallbackClips[0] ?? null),
    );

    expect(fallbackClips.map((clip) => clip?.name)).toEqual(["fallback-primary", "fallback-secondary"]);
  });

  it("skips mixer creation for null clips", () => {
    const targets = [buildTarget("primary", "fallback-primary"), buildTarget("secondary", "fallback-secondary")];
    const createMixer = vi.fn().mockReturnValue({
      clipAction: vi.fn().mockReturnValue({
        reset: vi.fn(),
        setLoop: vi.fn(),
        play: vi.fn(),
      }),
    });

    const result = createCharacterPlaybackMixers({
      targets,
      resolvedClips: [new AnimationClip("primary-resolved", 1, []), null],
      createMixer,
    });

    expect(createMixer).toHaveBeenCalledTimes(1);
    expect(result.primaryMixer).not.toBeNull();
    expect(result.secondaryMixer).toBeNull();
  });
});
