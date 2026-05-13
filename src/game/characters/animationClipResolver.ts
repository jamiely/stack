import { AnimationClip, Object3D } from "three";
import { retargetClip } from "three/examples/jsm/utils/SkeletonUtils.js";

const TRACK_TARGET_PATTERN = /^(.*)\.(position|quaternion|scale|morphTargetInfluences)(?:\[\d+\])?$/;
const SCALE_TRACK_PATTERN = /\.scale(?:\[\d+\])?$/;
const EXPLICIT_PREFERRED_CLIP_NAME = "Armature.001|mixamo.com|Layer0.001";

export interface AnimationClipTargetBinding {
  model: Object3D;
  fallbackClips: readonly AnimationClip[];
}

export function readTrackTargetName(trackName: string): string | null {
  const knownPropertyMatch = trackName.match(TRACK_TARGET_PATTERN);
  if (knownPropertyMatch?.[1]) {
    return knownPropertyMatch[1];
  }

  const lastDotIndex = trackName.lastIndexOf(".");
  if (lastDotIndex <= 0) {
    return null;
  }

  return trackName.slice(0, lastDotIndex);
}

export function isAnimationClipCompatibleWithModel(targetModel: Object3D, clip: AnimationClip): boolean {
  const targetNodeNames = new Set<string>();
  targetModel.traverse((node) => {
    if (node.name) {
      targetNodeNames.add(node.name);
    }
  });

  if (targetNodeNames.size === 0) {
    return false;
  }

  let matchedTracks = 0;
  clip.tracks.forEach((track) => {
    const targetName = readTrackTargetName(track.name);
    if (targetName && targetNodeNames.has(targetName)) {
      matchedTracks += 1;
    }
  });

  return matchedTracks > 0;
}

export function stripScaleTracksFromClip(clip: AnimationClip): AnimationClip {
  const nonScaleTracks = clip.tracks.filter((track) => !SCALE_TRACK_PATTERN.test(track.name));
  if (nonScaleTracks.length === clip.tracks.length || nonScaleTracks.length === 0) {
    return clip;
  }

  const sanitizedClip = clip.clone();
  sanitizedClip.tracks = nonScaleTracks.map((track) => track.clone());
  sanitizedClip.resetDuration();
  return sanitizedClip;
}

export function tryRetargetAnimationClip(targetModel: Object3D, sourceRig: Object3D, clip: AnimationClip): AnimationClip | null {
  try {
    const retargetedClip = retargetClip(targetModel, sourceRig, clip, {
      preserveBoneMatrix: true,
      preserveHipPosition: true,
      useTargetMatrix: true,
    });

    return retargetedClip.tracks.length > 0 ? retargetedClip : null;
  } catch (error) {
    console.warn("Failed to retarget Remy animation clip; falling back to the next clip candidate.", error);
    return null;
  }
}

export function resolveAnimationClipForTarget(
  targetModel: Object3D,
  sourceRig: Object3D,
  clip: AnimationClip,
): AnimationClip | null {
  if (isAnimationClipCompatibleWithModel(targetModel, clip)) {
    return stripScaleTracksFromClip(clip);
  }

  const retargetedClip = tryRetargetAnimationClip(targetModel, sourceRig, clip);
  if (!retargetedClip) {
    return null;
  }

  return isAnimationClipCompatibleWithModel(targetModel, retargetedClip)
    ? stripScaleTracksFromClip(retargetedClip)
    : null;
}

export function selectPreferredAnimationClip(clips: readonly AnimationClip[]): AnimationClip | null {
  if (clips.length === 0) {
    return null;
  }

  const explicitClip = clips.find((clip) => clip.name === EXPLICIT_PREFERRED_CLIP_NAME);
  if (explicitClip) {
    return explicitClip;
  }

  const hipHopClip = clips.find((clip) => /hip\s*hop/i.test(clip.name));
  if (hipHopClip) {
    return hipHopClip;
  }

  return clips.reduce((longest, clip) => (clip.duration > longest.duration ? clip : longest), clips[0]!);
}

export function resolveAnimationClipsForTargets(
  targets: readonly AnimationClipTargetBinding[],
  sourceRig: Object3D,
  sourceClips: readonly AnimationClip[],
): readonly (AnimationClip | null)[] | null {
  const preferredSourceClip = selectPreferredAnimationClip(sourceClips);
  if (!preferredSourceClip || targets.length === 0) {
    return null;
  }

  const resolvedClips = targets.map((target) => resolveAnimationClipForTarget(target.model, sourceRig, preferredSourceClip));
  return resolvedClips[0] ? resolvedClips : null;
}

export function resolveFallbackAnimationClips(targets: readonly AnimationClipTargetBinding[]): readonly (AnimationClip | null)[] {
  return targets.map((target) => {
    const preferredClip = selectPreferredAnimationClip(target.fallbackClips);
    return preferredClip ? resolveAnimationClipForTarget(target.model, target.model, preferredClip) : null;
  });
}
