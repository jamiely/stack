export interface CharacterAnimationBridge {
  preload(): void;
  spawnLedgeCharacter(): void;
  update(deltaSeconds: number): void;
  release(): void;
  disposeAll(): void;
}

export type CharacterAnimationBridgeCallbacks = CharacterAnimationBridge;

export function createCharacterAnimationCallbackBridge(
  callbacks: CharacterAnimationBridgeCallbacks,
): CharacterAnimationBridge {
  return {
    preload: () => callbacks.preload(),
    spawnLedgeCharacter: () => callbacks.spawnLedgeCharacter(),
    update: (deltaSeconds: number) => callbacks.update(deltaSeconds),
    release: () => callbacks.release(),
    disposeAll: () => callbacks.disposeAll(),
  };
}

export class CharacterAnimationManager {
  public constructor(private readonly bridge: CharacterAnimationBridge) {}

  public preload(): void {
    this.bridge.preload();
  }

  public spawnLedgeCharacter(): void {
    this.bridge.spawnLedgeCharacter();
  }

  public update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    this.bridge.update(deltaSeconds);
  }

  public release(): void {
    this.bridge.release();
  }

  public disposeAll(): void {
    this.bridge.disposeAll();
  }
}
