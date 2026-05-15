import { AnimationClip, Group } from "three";
import { describe, expect, it, vi } from "vitest";
import { loadCharacterCoordinatorResult } from "../../src/game/characters/characterLoadCoordinator";
import type { BuiltCharacterView } from "../../src/game/characters/modelPreparation";

function buildCharacterSetup(label: string): BuiltCharacterView {
  const animationTarget = new Group();
  animationTarget.name = `${label}-target`;

  return {
    view: {
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
    },
    animations: [new AnimationClip(`${label}-fallback`, 1, [])],
  };
}

describe("characterLoadCoordinator", () => {
  it("loads primary and secondary setups using per-character preparation config, then resolves animation candidates", async () => {
    const primarySetup = buildCharacterSetup("primary");
    const secondarySetup = buildCharacterSetup("secondary");
    const resolvedClips = [new AnimationClip("resolved-primary", 1, []), new AnimationClip("resolved-secondary", 1, [])] as const;
    const loadCharacterView = vi
      .fn<
        (typeof import("../../src/game/characters/characterAssetLoader"))["loadCharacterViewFromAsset"]
      >()
      .mockResolvedValueOnce(primarySetup)
      .mockResolvedValueOnce(secondarySetup);
    const loadResolvedAnimationClips = vi
      .fn<
        (typeof import("../../src/game/characters/characterAssetLoader"))["loadResolvedAnimationClipsForTargets"]
      >()
      .mockResolvedValue(resolvedClips);

    const result = await loadCharacterCoordinatorResult({
      selectedCharacter: { id: "remy", modelUrl: "/remy.glb" },
      secondaryCharacter: { id: "timmy", modelUrl: "/timmy.glb" },
      animationCandidates: [
        { id: "house", animationUrl: "/house.glb" },
        { id: "ymca", animationUrl: "/ymca.glb" },
      ],
      getPreparationConfig: (characterId) => ({
        autoDetectUpAxis: characterId === "remy",
        rotationOffsetZ: characterId === "remy" ? 0.1 : -0.2,
      }),
      loadCharacterView,
      loadResolvedAnimationClips,
    });

    expect(result).not.toBeNull();
    expect(loadCharacterView).toHaveBeenNthCalledWith(
      1,
      "/remy.glb",
      expect.objectContaining({
        characterId: "remy",
        nameSuffix: "primary",
        autoDetectUpAxis: true,
        rotationOffsetZ: 0.1,
      }),
    );
    expect(loadCharacterView).toHaveBeenNthCalledWith(
      2,
      "/timmy.glb",
      expect.objectContaining({
        characterId: "timmy",
        nameSuffix: "secondary",
        autoDetectUpAxis: false,
        rotationOffsetZ: -0.2,
      }),
    );
    expect(loadResolvedAnimationClips).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          model: primarySetup.view.animationTarget,
          role: "primary",
          fallbackClips: primarySetup.animations,
        }),
        expect.objectContaining({
          model: secondarySetup.view.animationTarget,
          role: "secondary",
          fallbackClips: secondarySetup.animations,
        }),
      ],
      [
        { id: "house", animationUrl: "/house.glb" },
        { id: "ymca", animationUrl: "/ymca.glb" },
      ],
    );
    expect(result?.resolvedClips).toBe(resolvedClips);
  });

  it("returns null when the primary setup cannot be built", async () => {
    const loadCharacterView = vi
      .fn<
        (typeof import("../../src/game/characters/characterAssetLoader"))["loadCharacterViewFromAsset"]
      >()
      .mockResolvedValueOnce(null);
    const loadResolvedAnimationClips = vi
      .fn<
        (typeof import("../../src/game/characters/characterAssetLoader"))["loadResolvedAnimationClipsForTargets"]
      >();

    const result = await loadCharacterCoordinatorResult({
      selectedCharacter: { id: "remy", modelUrl: "/remy.glb" },
      secondaryCharacter: null,
      animationCandidates: [],
      getPreparationConfig: () => ({ autoDetectUpAxis: true, rotationOffsetZ: 0 }),
      loadCharacterView,
      loadResolvedAnimationClips,
    });

    expect(result).toBeNull();
    expect(loadResolvedAnimationClips).not.toHaveBeenCalled();
  });

  it("warns and continues with only the primary setup when secondary loading throws", async () => {
    const primarySetup = buildCharacterSetup("primary");
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const loadCharacterView = vi
      .fn<
        (typeof import("../../src/game/characters/characterAssetLoader"))["loadCharacterViewFromAsset"]
      >()
      .mockResolvedValueOnce(primarySetup)
      .mockRejectedValueOnce(new Error("secondary failed"));
    const loadResolvedAnimationClips = vi
      .fn<
        (typeof import("../../src/game/characters/characterAssetLoader"))["loadResolvedAnimationClipsForTargets"]
      >()
      .mockResolvedValue([new AnimationClip("resolved-primary", 1, [])]);

    const result = await loadCharacterCoordinatorResult({
      selectedCharacter: { id: "remy", modelUrl: "/remy.glb" },
      secondaryCharacter: { id: "amy", modelUrl: "/amy.glb" },
      animationCandidates: [{ id: "house", animationUrl: "/house.glb" }],
      getPreparationConfig: () => ({ autoDetectUpAxis: true, rotationOffsetZ: 0 }),
      loadCharacterView,
      loadResolvedAnimationClips,
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to load secondary character model amy.", expect.any(Error));
    expect(result?.secondarySetup).toBeNull();
    expect(result?.animationTargets).toHaveLength(1);

    consoleWarnSpy.mockRestore();
  });
});
