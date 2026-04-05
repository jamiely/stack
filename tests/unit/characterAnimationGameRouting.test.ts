import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const gameSource = readFileSync(new URL("../../src/game/Game.ts", import.meta.url), "utf8");

function countMatches(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

describe("Game character animation facade routing", () => {
  it("wires lifecycle routing through CharacterAnimationManager entrypoints", () => {
    expect(gameSource).toContain("private readonly characterAnimationManager = new CharacterAnimationManager(");
    expect(gameSource).toContain("this.characterAnimationManager.preload();");
    expect(gameSource).toContain("this.characterAnimationManager.spawnLedgeCharacter();");
    expect(gameSource).toContain("this.characterAnimationManager.disposeAll();");

    expect(countMatches(gameSource, /this\.characterAnimationManager\.release\(\);/g)).toBeGreaterThanOrEqual(4);
  });

  it("routes shared simulation updates through manager update instead of direct Remy calls", () => {
    const runSimulationStepMatch = gameSource.match(/private runSimulationStep\(deltaSeconds: number\): void \{([\s\S]*?)\n  \}/);
    expect(runSimulationStepMatch).not.toBeNull();

    const runSimulationStepBody = runSimulationStepMatch?.[1] ?? "";
    expect(runSimulationStepBody).toContain("this.characterAnimationManager.update(deltaSeconds);");
    expect(runSimulationStepBody).not.toContain("this.updateRemyAnimation(deltaSeconds);");
  });

  it("removes direct preload/spawn/release callsites from Game orchestration paths", () => {
    expect(countMatches(gameSource, /this\.loadRemyCharacter\(\)/g)).toBe(2);
    expect(countMatches(gameSource, /this\.detachRemyCharacter\(\)/g)).toBe(2);
  });
});
