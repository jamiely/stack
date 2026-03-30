import { describe, expect, it } from "vitest";
import { resolveCloudSpawnNdcX, shouldRespawnCloud } from "../../src/game/logic/clouds";

describe("cloud logic", () => {
  it("respawns clouds that fall below the viewport", () => {
    expect(shouldRespawnCloud({ x: 0, y: 1.26, z: 0.3 })).toBe(true);
  });

  it("respawns clouds that move behind the camera", () => {
    expect(shouldRespawnCloud({ x: 0.2, y: 0.1, z: 1.11 })).toBe(true);
  });

  it("does not respawn clouds only because they are far left/right", () => {
    expect(shouldRespawnCloud({ x: 2.8, y: 0.2, z: 0.4 })).toBe(false);
    expect(shouldRespawnCloud({ x: -2.8, y: -0.2, z: 0.4 })).toBe(false);
  });

  it("maps spawn noise across the full horizontal NDC range", () => {
    expect(resolveCloudSpawnNdcX(0)).toBeCloseTo(-0.95, 6);
    expect(resolveCloudSpawnNdcX(0.5)).toBeCloseTo(0, 6);
    expect(resolveCloudSpawnNdcX(1)).toBeCloseTo(0.95, 6);
  });

  it("clamps spawn noise before mapping", () => {
    expect(resolveCloudSpawnNdcX(-5)).toBeCloseTo(-0.95, 6);
    expect(resolveCloudSpawnNdcX(9)).toBeCloseTo(0.95, 6);
  });

});
