import { AnimationClip, Group, NumberKeyframeTrack, QuaternionKeyframeTrack, VectorKeyframeTrack } from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("three/examples/jsm/utils/SkeletonUtils.js", () => ({
  retargetClip: vi.fn(),
}));

import { retargetClip } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  isAnimationClipCompatibleWithModel,
  readTrackTargetName,
  resolveAnimationClipForTarget,
  resolveAnimationClipsForTargets,
  resolveFallbackAnimationClips,
  selectPreferredAnimationClip,
  stripScaleTracksFromClip,
} from "../../src/game/characters/animationClipResolver";

function buildModel(...nodeNames: string[]): Group {
  const root = new Group();
  nodeNames.forEach((name) => {
    const child = new Group();
    child.name = name;
    root.add(child);
  });
  return root;
}

function buildClip(name: string, tracks: Array<VectorKeyframeTrack | QuaternionKeyframeTrack | NumberKeyframeTrack>, duration = 1): AnimationClip {
  return new AnimationClip(name, duration, tracks);
}

describe("animationClipResolver", () => {
  beforeEach(() => {
    vi.mocked(retargetClip).mockReset();
  });

  it("reads track target names from standard and fallback track paths", () => {
    expect(readTrackTargetName("Hip.position")).toBe("Hip");
    expect(readTrackTargetName("Spine.morphTargetInfluences[0]")).toBe("Spine");
    expect(readTrackTargetName("Armature.Bone.customChannel")).toBe("Armature.Bone");
    expect(readTrackTargetName("position")).toBeNull();
  });

  it("matches clips against model node names through track targets", () => {
    const model = buildModel("Hip", "Spine");
    const compatibleClip = buildClip("compatible", [
      new VectorKeyframeTrack("Hip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
      new QuaternionKeyframeTrack("Unknown.quaternion", [0, 1], [0, 0, 0, 1, 0, 0, 0, 1]),
    ]);
    const incompatibleClip = buildClip("incompatible", [
      new VectorKeyframeTrack("Tail.position", [0, 1], [0, 0, 0, 1, 1, 1]),
    ]);

    expect(isAnimationClipCompatibleWithModel(model, compatibleClip)).toBe(true);
    expect(isAnimationClipCompatibleWithModel(model, incompatibleClip)).toBe(false);
    expect(isAnimationClipCompatibleWithModel(new Group(), compatibleClip)).toBe(false);
  });

  it("strips scale tracks by cloning only the remaining animation tracks", () => {
    const clip = buildClip("scaled", [
      new VectorKeyframeTrack("Hip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
      new VectorKeyframeTrack("Hip.scale", [0, 1], [1, 1, 1, 2, 2, 2]),
    ]);

    const sanitizedClip = stripScaleTracksFromClip(clip);

    expect(sanitizedClip).not.toBe(clip);
    expect(sanitizedClip.tracks.map((track) => track.name)).toEqual(["Hip.position"]);
    expect(clip.tracks.map((track) => track.name)).toEqual(["Hip.position", "Hip.scale"]);
  });

  it("uses a compatible source clip directly and keeps playback-safe tracks only", () => {
    const model = buildModel("Hip");
    const sourceClip = buildClip("source", [
      new VectorKeyframeTrack("Hip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
      new VectorKeyframeTrack("Hip.scale", [0, 1], [1, 1, 1, 2, 2, 2]),
    ]);

    const resolvedClip = resolveAnimationClipForTarget(model, model, sourceClip);

    expect(resolvedClip).not.toBeNull();
    expect(resolvedClip?.tracks.map((track) => track.name)).toEqual(["Hip.position"]);
    expect(vi.mocked(retargetClip)).not.toHaveBeenCalled();
  });

  it("retargets incompatible clips with the expected SkeletonUtils options", () => {
    const targetModel = buildModel("TargetHip");
    const sourceRig = buildModel("SourceHip");
    const sourceClip = buildClip("source", [
      new VectorKeyframeTrack("SourceHip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
    ]);
    const retargetedClip = buildClip("retargeted", [
      new VectorKeyframeTrack("TargetHip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
      new VectorKeyframeTrack("TargetHip.scale", [0, 1], [1, 1, 1, 2, 2, 2]),
    ]);
    vi.mocked(retargetClip).mockReturnValue(retargetedClip);

    const resolvedClip = resolveAnimationClipForTarget(targetModel, sourceRig, sourceClip);

    expect(vi.mocked(retargetClip)).toHaveBeenCalledWith(targetModel, sourceRig, sourceClip, {
      preserveBoneMatrix: true,
      preserveHipPosition: true,
      useTargetMatrix: true,
    });
    expect(resolvedClip?.tracks.map((track) => track.name)).toEqual(["TargetHip.position"]);
  });

  it("rejects incompatible clips when retargeting throws or produces no tracks", () => {
    const targetModel = buildModel("TargetHip");
    const sourceRig = buildModel("SourceHip");
    const sourceClip = buildClip("source", [
      new VectorKeyframeTrack("SourceHip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
    ]);
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    vi.mocked(retargetClip).mockImplementationOnce(() => {
      throw new Error("retarget failed");
    });
    expect(resolveAnimationClipForTarget(targetModel, sourceRig, sourceClip)).toBeNull();

    vi.mocked(retargetClip).mockReturnValueOnce(buildClip("empty", []));
    expect(resolveAnimationClipForTarget(targetModel, sourceRig, sourceClip)).toBeNull();

    consoleWarnSpy.mockRestore();
  });

  it("selects explicit names first, then hip hop clips, then the longest clip", () => {
    const longestClip = buildClip("longest", [new VectorKeyframeTrack("Hip.position", [0, 2], [0, 0, 0, 2, 2, 2])], 2);
    const hipHopClip = buildClip("Hip Hop Groove", [new VectorKeyframeTrack("Hip.position", [0, 1], [0, 0, 0, 1, 1, 1])], 1);
    const explicitClip = buildClip("Armature.001|mixamo.com|Layer0.001", [new VectorKeyframeTrack("Hip.position", [0, 1], [0, 0, 0, 1, 1, 1])], 1);

    expect(selectPreferredAnimationClip([])).toBeNull();
    expect(selectPreferredAnimationClip([longestClip, hipHopClip])).toBe(hipHopClip);
    expect(selectPreferredAnimationClip([longestClip, hipHopClip, explicitClip])).toBe(explicitClip);
    expect(selectPreferredAnimationClip([hipHopClip, longestClip])).toBe(hipHopClip);
    expect(selectPreferredAnimationClip([buildClip("short", [new VectorKeyframeTrack("Hip.position", [0, 1], [0, 0, 0, 1, 1, 1])], 1), longestClip])).toBe(longestClip);
  });

  it("resolves source animation clips for all targets and rejects candidates without a primary clip", () => {
    const primaryModel = buildModel("PrimaryHip");
    const secondaryModel = buildModel("SecondaryHip");
    const sourceRig = buildModel("SourceHip");
    const preferredClip = buildClip("Hip Hop Source", [
      new VectorKeyframeTrack("SourceHip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
    ]);
    vi.mocked(retargetClip)
      .mockReturnValueOnce(buildClip("primary-retarget", [
        new VectorKeyframeTrack("PrimaryHip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
      ]))
      .mockReturnValueOnce(buildClip("secondary-retarget", [
        new VectorKeyframeTrack("SecondaryHip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
      ]));

    const resolvedClips = resolveAnimationClipsForTargets(
      [
        { model: primaryModel, fallbackClips: [] },
        { model: secondaryModel, fallbackClips: [] },
      ],
      sourceRig,
      [preferredClip],
    );

    expect(resolvedClips).not.toBeNull();
    expect(resolvedClips?.map((clip) => clip?.tracks[0]?.name)).toEqual(["PrimaryHip.position", "SecondaryHip.position"]);

    vi.mocked(retargetClip).mockReset();
    vi.mocked(retargetClip).mockReturnValue(buildClip("still-wrong", [
      new VectorKeyframeTrack("WrongHip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
    ]));

    expect(resolveAnimationClipsForTargets([{ model: primaryModel, fallbackClips: [] }], sourceRig, [preferredClip])).toBeNull();
    expect(resolveAnimationClipsForTargets([], sourceRig, [preferredClip])).toBeNull();
    expect(resolveAnimationClipsForTargets([{ model: primaryModel, fallbackClips: [] }], sourceRig, [])).toBeNull();
  });

  it("resolves per-target fallback clips using the same preferred-clip rules", () => {
    const explicitClip = buildClip("Armature.001|mixamo.com|Layer0.001", [
      new VectorKeyframeTrack("PrimaryHip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
    ]);
    const longestClip = buildClip("longest", [
      new VectorKeyframeTrack("SecondaryHip.position", [0, 2], [0, 0, 0, 2, 2, 2]),
    ], 2);
    const hipHopClip = buildClip("Hip Hop Fallback", [
      new VectorKeyframeTrack("SecondaryHip.position", [0, 1], [0, 0, 0, 1, 1, 1]),
    ]);

    const fallbackClips = resolveFallbackAnimationClips([
      {
        model: buildModel("PrimaryHip"),
        fallbackClips: [buildClip("other", [new VectorKeyframeTrack("Other.position", [0, 1], [0, 0, 0, 1, 1, 1])]), explicitClip],
      },
      {
        model: buildModel("SecondaryHip"),
        fallbackClips: [longestClip, hipHopClip],
      },
    ]);

    expect(fallbackClips.map((clip) => clip?.name)).toEqual(["Armature.001|mixamo.com|Layer0.001", "Hip Hop Fallback"]);
  });
});
