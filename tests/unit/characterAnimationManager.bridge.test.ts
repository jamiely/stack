import { describe, expect, it, vi } from "vitest";
import {
  createCharacterAnimationCallbackBridge,
  type CharacterAnimationBridgeCallbacks,
} from "../../src/game/logic/characterAnimationManager";

describe("createCharacterAnimationCallbackBridge", () => {
  it("forwards all lifecycle entrypoints through the provided callbacks", () => {
    const callbacks: CharacterAnimationBridgeCallbacks = {
      preload: vi.fn(),
      spawnLedgeCharacter: vi.fn(),
      update: vi.fn<(deltaSeconds: number) => void>(),
      release: vi.fn(),
      disposeAll: vi.fn(),
    };

    const bridge = createCharacterAnimationCallbackBridge(callbacks);
    bridge.preload();
    bridge.spawnLedgeCharacter();
    bridge.update(0.0375);
    bridge.release();
    bridge.disposeAll();

    expect(callbacks.preload).toHaveBeenCalledTimes(1);
    expect(callbacks.spawnLedgeCharacter).toHaveBeenCalledTimes(1);
    expect(callbacks.update).toHaveBeenCalledTimes(1);
    expect(callbacks.update).toHaveBeenCalledWith(0.0375);
    expect(callbacks.release).toHaveBeenCalledTimes(1);
    expect(callbacks.disposeAll).toHaveBeenCalledTimes(1);
  });

  it("remains deterministic and free of hidden mutable bridge state", () => {
    const callLog: string[] = [];
    const callbacks = Object.freeze({
      preload: () => callLog.push("preload"),
      spawnLedgeCharacter: () => callLog.push("spawnLedgeCharacter"),
      update: (deltaSeconds: number) => callLog.push(`update:${deltaSeconds.toFixed(3)}`),
      release: () => callLog.push("release"),
      disposeAll: () => callLog.push("disposeAll"),
    }) as CharacterAnimationBridgeCallbacks;

    const bridge = createCharacterAnimationCallbackBridge(callbacks);

    for (let index = 0; index < 2; index += 1) {
      bridge.preload();
      bridge.spawnLedgeCharacter();
      bridge.update(0.1);
      bridge.release();
      bridge.disposeAll();
    }

    expect(callLog).toEqual([
      "preload",
      "spawnLedgeCharacter",
      "update:0.100",
      "release",
      "disposeAll",
      "preload",
      "spawnLedgeCharacter",
      "update:0.100",
      "release",
      "disposeAll",
    ]);
  });
});
