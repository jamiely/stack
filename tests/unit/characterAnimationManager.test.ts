import { describe, expect, it, vi } from "vitest";
import {
  CharacterAnimationManager,
  type CharacterAnimationBridge,
} from "../../src/game/logic/characterAnimationManager";

function createBridgeSpy(): {
  bridge: CharacterAnimationBridge;
  spies: Record<keyof CharacterAnimationBridge, ReturnType<typeof vi.fn>>;
} {
  const spies = {
    preload: vi.fn(),
    spawnLedgeCharacter: vi.fn(),
    update: vi.fn<(deltaSeconds: number) => void>(),
    release: vi.fn(),
    disposeAll: vi.fn(),
  };

  return {
    bridge: spies,
    spies,
  };
}

describe("CharacterAnimationManager facade contract", () => {
  it("exposes the Step 1 lifecycle entrypoints", () => {
    const { bridge } = createBridgeSpy();
    const manager = new CharacterAnimationManager(bridge);

    expect(typeof manager.preload).toBe("function");
    expect(typeof manager.spawnLedgeCharacter).toBe("function");
    expect(typeof manager.update).toBe("function");
    expect(typeof manager.release).toBe("function");
    expect(typeof manager.disposeAll).toBe("function");
  });

  it("forwards each lifecycle call to the matching bridge method exactly once", () => {
    const { bridge, spies } = createBridgeSpy();
    const manager = new CharacterAnimationManager(bridge);

    manager.preload();
    manager.spawnLedgeCharacter();
    manager.update(1 / 60);
    manager.release();
    manager.disposeAll();

    expect(spies.preload).toHaveBeenCalledTimes(1);
    expect(spies.spawnLedgeCharacter).toHaveBeenCalledTimes(1);
    expect(spies.update).toHaveBeenCalledTimes(1);
    expect(spies.update).toHaveBeenCalledWith(1 / 60);
    expect(spies.release).toHaveBeenCalledTimes(1);
    expect(spies.disposeAll).toHaveBeenCalledTimes(1);
  });

  it("treats non-positive update deltas as a no-op", () => {
    const { bridge, spies } = createBridgeSpy();
    const manager = new CharacterAnimationManager(bridge);

    manager.update(0);
    manager.update(-0.125);

    expect(spies.update).not.toHaveBeenCalled();
  });

  it("keeps release and disposeAll safe for repeated calls", () => {
    const { bridge, spies } = createBridgeSpy();
    const manager = new CharacterAnimationManager(bridge);

    expect(() => {
      manager.release();
      manager.release();
      manager.disposeAll();
      manager.disposeAll();
    }).not.toThrow();

    expect(spies.release).toHaveBeenCalledTimes(2);
    expect(spies.disposeAll).toHaveBeenCalledTimes(2);
  });
});
