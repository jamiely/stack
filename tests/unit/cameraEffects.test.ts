import { describe, expect, it } from "vitest";
import { samplePlacementCameraShake, sampleTremorCameraShake } from "../../src/game/logic/cameraEffects";

describe("cameraEffects", () => {
  it("adds vertical shake during tremors", () => {
    const shake = sampleTremorCameraShake(1.2, 0.8);
    expect(Math.abs(shake.y)).toBeGreaterThan(0);
  });

  it("returns zero shake when tremor strength is disabled", () => {
    expect(sampleTremorCameraShake(1.2, 0)).toEqual({ x: 0, y: 0 });
  });

  it("returns zero shake when tremor vertical magnitude is disabled", () => {
    expect(sampleTremorCameraShake(1.2, 0.8, 0)).toEqual({ x: 0, y: 0 });
  });

  it("scales vertical tremor shake by configured magnitude", () => {
    const low = sampleTremorCameraShake(1.2, 0.8, 0.5);
    const high = sampleTremorCameraShake(1.2, 0.8, 1.5);
    expect(Math.abs(high.y)).toBeGreaterThan(Math.abs(low.y));
  });

  it("applies placement shake across x/y/z when active", () => {
    const shake = samplePlacementCameraShake(2.4, 0.1, 0.16, 0.4);
    expect(Math.abs(shake.x) + Math.abs(shake.y) + Math.abs(shake.z)).toBeGreaterThan(0);
  });
});
