import { describe, expect, it } from "vitest";
import type { RemyCharacterId, RemyDebugConfig } from "../../src/game/characters/contracts";
import {
  applyRemyDebugConfigPatch,
  resolveBaseRemyDebugConfig,
  resolveStoredRemyDebugConfig,
  syncRemyDebugInputValues,
  syncRemyDebugValueLabels,
} from "../../src/game/characters/characterDebugControls";

const baseConfig: RemyDebugConfig = {
  yawDegrees: 1,
  pitchDegrees: 2,
  rollDegrees: 3,
  translateX: 4,
  translateY: 5,
  translateZ: 6,
};

describe("characterDebugControls", () => {
  it("resolves stored config before falling back to per-character defaults", () => {
    const storedConfigs = new Map<RemyCharacterId, RemyDebugConfig>([
      [
        "timmy",
        {
          yawDegrees: 10,
          pitchDegrees: 20,
          rollDegrees: 30,
          translateX: 0.1,
          translateY: 0.2,
          translateZ: 0.3,
        },
      ],
    ]);

    expect(
      resolveStoredRemyDebugConfig({
        characterId: "timmy",
        storedConfigs,
        testMode: false,
      }),
    ).toEqual({
      yawDegrees: 10,
      pitchDegrees: 20,
      rollDegrees: 30,
      translateX: 0.1,
      translateY: 0.2,
      translateZ: 0.3,
    });

    expect(resolveBaseRemyDebugConfig("remy", { testMode: false })).not.toEqual(baseConfig);
  });

  it("applies a patch and stores it for the active character", () => {
    const storedConfigs = new Map();
    const result = applyRemyDebugConfigPatch({
      currentConfig: baseConfig,
      patch: { yawDegrees: 45, translateY: 1.25 },
      activeCharacterId: "amy",
      storedConfigs,
    });

    expect(result.nextConfig).toEqual({
      ...baseConfig,
      yawDegrees: 45,
      translateY: 1.25,
    });
    expect(result.nextStoredConfigs.get("amy")).toEqual(result.nextConfig);
    expect(storedConfigs.size).toBe(0);
  });

  it("syncs slider inputs and formatted value labels from the active config", () => {
    const inputs = [
      { dataset: { remyDebugKey: "yawDegrees" }, value: "" },
      { dataset: { remyDebugKey: "translateY" }, value: "" },
      { dataset: {}, value: "unchanged" },
    ];
    const labels = [
      { dataset: { remyDebugValue: "rollDegrees" }, textContent: null },
      { dataset: { remyDebugValue: "translateX" }, textContent: null },
      { dataset: {}, textContent: "untouched" },
    ];

    syncRemyDebugInputValues(inputs, baseConfig);
    syncRemyDebugValueLabels(labels, baseConfig);

    expect(inputs).toEqual([
      { dataset: { remyDebugKey: "yawDegrees" }, value: "1" },
      { dataset: { remyDebugKey: "translateY" }, value: "5" },
      { dataset: {}, value: "unchanged" },
    ]);
    expect(labels).toEqual([
      { dataset: { remyDebugValue: "rollDegrees" }, textContent: "3.00°" },
      { dataset: { remyDebugValue: "translateX" }, textContent: "4.00" },
      { dataset: {}, textContent: "untouched" },
    ]);
  });
});
