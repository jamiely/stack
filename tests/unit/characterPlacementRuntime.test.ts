import { describe, expect, it } from "vitest";
import {
  readCharacterFaceId,
  resolveCharacterSidePose,
  resolveDualCharacterLaneOffsets,
} from "../../src/game/characters/placementRuntime";

describe("character placement runtime helpers", () => {
  it("reads only supported face ids", () => {
    expect(readCharacterFaceId("posX")).toBe("posX");
    expect(readCharacterFaceId("negZ")).toBe("negZ");
    expect(readCharacterFaceId("front")).toBeNull();
    expect(readCharacterFaceId(null)).toBeNull();
  });

  it("resolves side-pose presets with a fallback", () => {
    expect(resolveCharacterSidePose("posZ")).toMatchObject({ translateZ: 0 });
    expect(resolveCharacterSidePose(null)).toMatchObject({
      yawDegrees: 0,
      pitchDegrees: 0,
      rollDegrees: 0,
      translateX: 0,
      translateY: 0,
      translateZ: 0,
    });
  });

  it("returns a centered single lane when dual placement is disabled", () => {
    expect(
      resolveDualCharacterLaneOffsets({
        usableWidth: 1,
        useDualCharacters: false,
        edgePadding: 0.04,
        spreadRatio: 0.22,
        minSpread: 0.08,
      }),
    ).toEqual([0]);
  });

  it("derives mirrored dual-character lane offsets within the usable width", () => {
    expect(
      resolveDualCharacterLaneOffsets({
        usableWidth: 2,
        useDualCharacters: true,
        edgePadding: 0.04,
        spreadRatio: 0.22,
        minSpread: 0.08,
      }),
    ).toEqual([-0.44, 0.44]);
  });

  it("falls back to a centered lane when the spread budget is invalid", () => {
    expect(
      resolveDualCharacterLaneOffsets({
        usableWidth: Number.NaN,
        useDualCharacters: true,
        edgePadding: 0.04,
        spreadRatio: 0.22,
        minSpread: 0.08,
      }),
    ).toEqual([0]);
  });
});
