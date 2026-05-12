import { describe, expect, it } from "vitest";
import {
  REMY_CHARACTER_ASSETS,
  REMY_CHARACTER_MODEL_CONFIGS,
  REMY_LEGACY_DEBUG_DEFAULTS,
  REMY_TEST_MODE_DEBUG_DEFAULTS,
  getRemyDebugDefaults,
} from "../../src/game/characters/modelConfigs";

describe("remy model configs", () => {
  it("defines normalization defaults for every character asset", () => {
    const assetIds = REMY_CHARACTER_ASSETS.map((asset) => asset.id).sort();
    const configIds = Object.keys(REMY_CHARACTER_MODEL_CONFIGS).sort();

    expect(assetIds).toEqual(configIds);
  });

  it("stores finite per-character debug defaults", () => {
    Object.values(REMY_CHARACTER_MODEL_CONFIGS).forEach((config) => {
      Object.values(config.debugDefaults).forEach((value) => {
        expect(Number.isFinite(value)).toBe(true);
      });
    });
  });

  it("uses the legacy remy defaults when test mode is enabled", () => {
    expect(getRemyDebugDefaults("timmy", { testMode: true })).toEqual(REMY_TEST_MODE_DEBUG_DEFAULTS);
    expect(REMY_TEST_MODE_DEBUG_DEFAULTS).toEqual(REMY_LEGACY_DEBUG_DEFAULTS);
  });
});