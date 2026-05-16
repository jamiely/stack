import { describe, expect, it } from "vitest";
import { buildNextRemyCharacterSelection } from "../../src/game/characters/characterSelection";

const characterAssets = [
  { id: "remy", modelUrl: "/remy.glb" },
  { id: "timmy", modelUrl: "/timmy.glb" },
  { id: "amy", modelUrl: "/amy.glb" },
] as const;

const animationAssets = [
  { id: "house", animationUrl: "/house.glb" },
  { id: "ymca", animationUrl: "/ymca.glb" },
  { id: "hip-hop", animationUrl: "/hip-hop.glb" },
] as const;

describe("buildNextRemyCharacterSelection", () => {
  it("rotates through primary and secondary characters without repeating the same slot", () => {
    const result = buildNextRemyCharacterSelection({
      selectionSeed: 1234,
      selectionSerial: 1,
      characterRotationIndex: 0,
      lastAnimationIndex: null,
      shouldLoadSecondaryCharacter: true,
      characterAssets,
      animationAssets,
    });

    expect(result.selectedCharacter?.id).toBe("remy");
    expect(result.secondaryCharacter?.id).toBe("timmy");
    expect(result.nextCharacterRotationIndex).toBe(2);
  });

  it("uses a derived seeded-random order and avoids repeating the previous animation first choice", () => {
    const first = buildNextRemyCharacterSelection({
      selectionSeed: 9,
      selectionSerial: 3,
      characterRotationIndex: 1,
      lastAnimationIndex: 1,
      shouldLoadSecondaryCharacter: false,
      characterAssets,
      animationAssets,
    });
    const second = buildNextRemyCharacterSelection({
      selectionSeed: 9,
      selectionSerial: 3,
      characterRotationIndex: 1,
      lastAnimationIndex: 1,
      shouldLoadSecondaryCharacter: false,
      characterAssets,
      animationAssets,
    });

    expect(first.animationCandidates.map((asset) => asset.id)).toEqual(second.animationCandidates.map((asset) => asset.id));
    expect(first.animationCandidates[0]?.id).not.toBe(animationAssets[1].id);
    expect(first.nextLastAnimationIndex).not.toBe(1);
  });

  it("returns safe null/empty outputs when no assets are available", () => {
    const result = buildNextRemyCharacterSelection({
      selectionSeed: 1,
      selectionSerial: 1,
      characterRotationIndex: 4,
      lastAnimationIndex: 0,
      shouldLoadSecondaryCharacter: true,
      characterAssets: [],
      animationAssets: [],
    });

    expect(result.selectedCharacter).toBeNull();
    expect(result.secondaryCharacter).toBeNull();
    expect(result.animationCandidates).toEqual([]);
    expect(result.nextCharacterRotationIndex).toBe(0);
    expect(result.nextLastAnimationIndex).toBeNull();
  });
});
