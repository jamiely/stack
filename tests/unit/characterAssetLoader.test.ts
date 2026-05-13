import { AnimationClip, Group, Mesh, BoxGeometry, MeshBasicMaterial, VectorKeyframeTrack } from "three";
import { describe, expect, it, vi } from "vitest";
import {
  loadCharacterViewFromAsset,
  loadResolvedAnimationClipsForTargets,
  type GltfLoaderHandleFactory,
} from "../../src/game/characters/characterAssetLoader";
import type { LoadedCharacterScene } from "../../src/game/characters/modelPreparation";

function createLoaderFactory(
  loaders: Array<{
    loadAsync: (url: string) => Promise<LoadedCharacterScene>;
    dispose?: () => void;
  }>,
): { factory: GltfLoaderHandleFactory; disposeSpies: ReturnType<typeof vi.fn>[] } {
  const disposeSpies: ReturnType<typeof vi.fn>[] = [];
  let index = 0;

  return {
    factory: () => {
      const loader = loaders[index];
      if (!loader) {
        throw new Error(`No fake loader configured for request ${index}`);
      }
      index += 1;
      const dispose = vi.fn(loader.dispose ?? (() => undefined));
      disposeSpies.push(dispose);
      return {
        loader: {
          loadAsync: loader.loadAsync,
        },
        dispose,
      };
    },
    disposeSpies,
  };
}

function buildScene(name: string, size = { x: 1, y: 2, z: 1 }): Group {
  const root = new Group();
  root.name = `${name}Root`;

  const child = new Group();
  child.name = name;
  child.add(new Mesh(new BoxGeometry(size.x, size.y, size.z), new MeshBasicMaterial()));
  root.add(child);
  return root;
}

describe("characterAssetLoader", () => {
  it("loads a character view from a model asset and always disposes the loader", async () => {
    const scene = buildScene("Hero", { x: 1, y: 2, z: 1 });
    const { factory, disposeSpies } = createLoaderFactory([
      {
        loadAsync: async (url) => {
          expect(url).toBe("/hero.glb");
          return {
            scene,
            scenes: [scene],
            animations: [],
          };
        },
      },
    ]);

    const built = await loadCharacterViewFromAsset(
      "/hero.glb",
      {
        characterId: "remy",
        nameSuffix: "test",
      },
      factory,
    );

    expect(built).not.toBeNull();
    expect(built?.view.baseHeight).toBeGreaterThan(0);
    expect(built?.view.baseDepth).toBeGreaterThan(0);
    expect(disposeSpies).toHaveLength(1);
    expect(disposeSpies[0]).toHaveBeenCalledTimes(1);
  });

  it("disposes the loader when model loading rejects", async () => {
    const { factory, disposeSpies } = createLoaderFactory([
      {
        loadAsync: async () => {
          throw new Error("load failed");
        },
      },
    ]);

    await expect(
      loadCharacterViewFromAsset(
        "/broken.glb",
        {
          characterId: "remy",
          nameSuffix: "test",
        },
        factory,
      ),
    ).rejects.toThrow("load failed");

    expect(disposeSpies).toHaveLength(1);
    expect(disposeSpies[0]).toHaveBeenCalledTimes(1);
  });

  it("tries animation candidates in order until one resolves clips", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const targetModel = buildScene("Hero");
    const incompatibleScene = buildScene("Villain");
    const compatibleScene = buildScene("SourceHip");
    const incompatibleClip = new AnimationClip("wrong", 1, [
      new VectorKeyframeTrack("Villain.position", [0, 1], [0, 0, 0, 1, 1, 1]),
    ]);
    const compatibleClip = new AnimationClip("right", 1, [
      new VectorKeyframeTrack("Hero.position", [0, 1], [0, 0, 0, 1, 1, 1]),
    ]);
    const { factory, disposeSpies } = createLoaderFactory([
      {
        loadAsync: async () => ({
          scene: incompatibleScene,
          scenes: [incompatibleScene],
          animations: [incompatibleClip],
        }),
      },
      {
        loadAsync: async () => ({
          scene: compatibleScene,
          scenes: [compatibleScene],
          animations: [compatibleClip],
        }),
      },
    ]);

    const resolved = await loadResolvedAnimationClipsForTargets(
      [{ model: targetModel, fallbackClips: [] }],
      [
        { id: "bad", animationUrl: "/bad.glb" },
        { id: "good", animationUrl: "/good.glb" },
      ],
      factory,
    );

    expect(resolved).not.toBeNull();
    expect(resolved?.[0]?.name).toBe("right");
    expect(disposeSpies).toHaveLength(2);
    expect(disposeSpies[0]).toHaveBeenCalledTimes(1);
    expect(disposeSpies[1]).toHaveBeenCalledTimes(1);
    consoleWarnSpy.mockRestore();
  });

  it("warns on failed animation candidates, disposes each loader, and falls back to later candidates", async () => {
    const targetModel = buildScene("Hero");
    const compatibleScene = buildScene("Hero");
    const compatibleClip = new AnimationClip("hero-dance", 1, [
      new VectorKeyframeTrack("Hero.position", [0, 1], [0, 0, 0, 1, 1, 1]),
    ]);
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { factory, disposeSpies } = createLoaderFactory([
      {
        loadAsync: async () => {
          throw new Error("network");
        },
      },
      {
        loadAsync: async () => ({
          scene: compatibleScene,
          scenes: [compatibleScene],
          animations: [compatibleClip],
        }),
      },
    ]);

    const resolved = await loadResolvedAnimationClipsForTargets(
      [{ model: targetModel, fallbackClips: [] }],
      [
        { id: "broken", animationUrl: "/broken.glb" },
        { id: "working", animationUrl: "/working.glb" },
      ],
      factory,
    );

    expect(resolved?.[0]?.name).toBe("hero-dance");
    expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to load animation clip broken.", expect.any(Error));
    expect(disposeSpies).toHaveLength(2);
    expect(disposeSpies[0]).toHaveBeenCalledTimes(1);
    expect(disposeSpies[1]).toHaveBeenCalledTimes(1);

    consoleWarnSpy.mockRestore();
  });
});
