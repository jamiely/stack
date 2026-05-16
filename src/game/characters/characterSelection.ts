import { pickNonRepeatingIndex } from "../logic/remy";
import { createSeededRandom } from "../logic/random";
import type { RemyAnimationAsset, RemyCharacterAsset } from "./contracts";

export interface BuildNextRemyCharacterSelectionOptions {
  selectionSeed: number | null;
  selectionSerial: number;
  characterRotationIndex: number;
  lastAnimationIndex: number | null;
  shouldLoadSecondaryCharacter: boolean;
  characterAssets: readonly RemyCharacterAsset[];
  animationAssets: readonly RemyAnimationAsset[];
}

export interface RemyCharacterSelectionResult {
  selectedCharacter: RemyCharacterAsset | null;
  secondaryCharacter: RemyCharacterAsset | null;
  animationCandidates: readonly RemyAnimationAsset[];
  nextCharacterRotationIndex: number;
  nextLastAnimationIndex: number | null;
}

export function buildNextRemyCharacterSelection(
  options: BuildNextRemyCharacterSelectionOptions,
): RemyCharacterSelectionResult {
  const random = createSelectionRandom(options.selectionSeed, options.selectionSerial);
  const { index: primaryCharacterIndex, nextRotationIndex: nextPrimaryRotationIndex } = drawNextCharacterIndex(
    options.characterAssets,
    options.characterRotationIndex,
  );
  const {
    index: secondaryCharacterIndex,
    nextRotationIndex,
  } = options.shouldLoadSecondaryCharacter
    ? drawNextCharacterIndex(options.characterAssets, nextPrimaryRotationIndex)
    : { index: null, nextRotationIndex: nextPrimaryRotationIndex };

  const selectedAnimationIndex = pickNonRepeatingIndex(
    options.animationAssets.length,
    random(),
    options.lastAnimationIndex,
  );

  return {
    selectedCharacter: primaryCharacterIndex === null ? null : (options.characterAssets[primaryCharacterIndex] ?? null),
    secondaryCharacter: secondaryCharacterIndex === null ? null : (options.characterAssets[secondaryCharacterIndex] ?? null),
    animationCandidates: buildAnimationCandidateOrder(options.animationAssets, selectedAnimationIndex, random),
    nextCharacterRotationIndex: nextRotationIndex,
    nextLastAnimationIndex: options.animationAssets.length > 0 ? selectedAnimationIndex : null,
  };
}

function createSelectionRandom(selectionSeed: number | null, selectionSerial: number): () => number {
  if (selectionSeed === null) {
    return Math.random;
  }

  const derivedSeed = (selectionSeed ^ Math.imul(selectionSerial, 0x9e3779b1)) >>> 0;
  return createSeededRandom(derivedSeed);
}

function drawNextCharacterIndex(
  characterAssets: readonly RemyCharacterAsset[],
  characterRotationIndex: number,
): { index: number | null; nextRotationIndex: number } {
  if (characterAssets.length <= 0) {
    return {
      index: null,
      nextRotationIndex: 0,
    };
  }

  const index = characterRotationIndex % characterAssets.length;
  return {
    index,
    nextRotationIndex: (characterRotationIndex + 1) % characterAssets.length,
  };
}

function buildAnimationCandidateOrder(
  animationAssets: readonly RemyAnimationAsset[],
  selectedIndex: number,
  random: () => number,
): RemyAnimationAsset[] {
  const fallbackIndices = animationAssets
    .map((_, index) => index)
    .filter((index) => index !== selectedIndex);

  for (let index = fallbackIndices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = fallbackIndices[index];
    fallbackIndices[index] = fallbackIndices[swapIndex]!;
    fallbackIndices[swapIndex] = current!;
  }

  const orderedIndices = [selectedIndex, ...fallbackIndices];
  return orderedIndices
    .map((index) => animationAssets[index])
    .filter((asset): asset is RemyAnimationAsset => Boolean(asset));
}
