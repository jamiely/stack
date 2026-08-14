import { describe, expect, it } from "vitest";
import { resolveDistractionOrbitAnchorY } from "../../src/game/distractions/orbitAnchor";

describe("distraction orbit anchor", () => {
  it("lets actor world height lag behind the rising camera after the channel starts", () => {
    const slabHeight = 3;
    const startLevel = 16;
    const startTopCenterY = 48;
    const fourLevelsLaterTopCenterY = startTopCenterY + slabHeight * 4;

    const anchoredY = resolveDistractionOrbitAnchorY({
      anchorY: fourLevelsLaterTopCenterY,
      currentLevel: startLevel + 4,
      startLevel,
      slabHeight,
    });

    expect(anchoredY).toBeLessThan(fourLevelsLaterTopCenterY);
    expect(anchoredY).toBeCloseTo(fourLevelsLaterTopCenterY - slabHeight * 4 * 0.1, 5);
  });

  it("caps the downward screen drift so late-game distractions stay visible", () => {
    const slabHeight = 3;
    const startLevel = 16;
    const topCenterYTwentyLevelsLater = 48 + slabHeight * 20;

    const anchoredY = resolveDistractionOrbitAnchorY({
      anchorY: topCenterYTwentyLevelsLater,
      currentLevel: startLevel + 20,
      startLevel,
      slabHeight,
    });

    expect(anchoredY).toBeCloseTo(topCenterYTwentyLevelsLater - slabHeight * 10 * 0.1, 5);
  });
});
