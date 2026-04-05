import { describe, expect, it } from "vitest";
import {
  REMY_LEDGE_SPAWN_CHANCE,
  hasRecentTentacleBurstOnFace,
  pickNonRepeatingIndex,
  shouldKeepCurrentRemyAnchor,
  shouldSpawnDualRemyCharacters,
  shouldSpawnRemyOnLedge,
  shouldSpawnTentacleBurst,
  type TentacleBurstMarker,
} from "../../src/game/logic/remy";

describe("shouldKeepCurrentRemyAnchor", () => {
  it("keeps the current anchor only when all visibility conditions pass", () => {
    expect(
      shouldKeepCurrentRemyAnchor({
        hasAnchor: true,
        hasLedge: true,
        slabMeshAttached: true,
        slabNearScreen: true,
        anchorFaceVisible: true,
      }),
    ).toBe(true);

    expect(
      shouldKeepCurrentRemyAnchor({
        hasAnchor: true,
        hasLedge: true,
        slabMeshAttached: false,
        slabNearScreen: true,
        anchorFaceVisible: true,
      }),
    ).toBe(false);
  });
});

describe("hasRecentTentacleBurstOnFace", () => {
  const bursts: TentacleBurstMarker[] = [
    { slabLevel: 10, faceNoiseSalt: 1.7, createdAtSeconds: 8 },
    { slabLevel: 10, faceNoiseSalt: 4.3, createdAtSeconds: 7.5 },
  ];

  it("matches only the same slab face within suppression window", () => {
    expect(hasRecentTentacleBurstOnFace(bursts, 10, 1.7, 8.2, 0.45)).toBe(true);
    expect(hasRecentTentacleBurstOnFace(bursts, 10, 4.3, 8.2, 0.45)).toBe(false);
    expect(hasRecentTentacleBurstOnFace(bursts, 9, 1.7, 8.2, 0.45)).toBe(false);
  });

  it("ignores stale and future-dated bursts", () => {
    expect(hasRecentTentacleBurstOnFace([{ slabLevel: 5, faceNoiseSalt: 2.9, createdAtSeconds: 1 }], 5, 2.9, 3, 0.45)).toBe(false);
    expect(hasRecentTentacleBurstOnFace([{ slabLevel: 5, faceNoiseSalt: 2.9, createdAtSeconds: 4 }], 5, 2.9, 3, 0.45)).toBe(false);
  });
});

describe("shouldSpawnDualRemyCharacters", () => {
  it("enables dual-character placement only for very wide ledges", () => {
    expect(shouldSpawnDualRemyCharacters(0.74)).toBe(false);
    expect(shouldSpawnDualRemyCharacters(0.75)).toBe(true);
    expect(shouldSpawnDualRemyCharacters(1)).toBe(true);
  });

  it("rejects invalid ratios", () => {
    expect(shouldSpawnDualRemyCharacters(Number.NaN)).toBe(false);
    expect(shouldSpawnDualRemyCharacters(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("shouldSpawnRemyOnLedge", () => {
  it("defaults to a 50% spawn gate for eligible ledges", () => {
    expect(
      shouldSpawnRemyOnLedge({
        spawnNoise: 0.49,
        spawnChance: REMY_LEDGE_SPAWN_CHANCE,
      }),
    ).toBe(true);

    expect(
      shouldSpawnRemyOnLedge({
        spawnNoise: 0.5,
        spawnChance: REMY_LEDGE_SPAWN_CHANCE,
      }),
    ).toBe(false);
  });

  it("clamps invalid chance/noise inputs", () => {
    expect(
      shouldSpawnRemyOnLedge({
        spawnNoise: Number.NaN,
        spawnChance: 1,
      }),
    ).toBe(false);

    expect(
      shouldSpawnRemyOnLedge({
        spawnNoise: 0,
        spawnChance: -2,
      }),
    ).toBe(false);

    expect(
      shouldSpawnRemyOnLedge({
        spawnNoise: 0.99,
        spawnChance: 3,
      }),
    ).toBe(true);
  });
});

describe("pickNonRepeatingIndex", () => {
  it("never repeats the previous index when multiple choices exist", () => {
    expect(pickNonRepeatingIndex(4, 0, 0)).toBe(1);
    expect(pickNonRepeatingIndex(4, 0.5, 2)).not.toBe(2);
    expect(pickNonRepeatingIndex(4, 0.99, 3)).not.toBe(3);
  });

  it("falls back to bounded selection when previous index is unavailable", () => {
    expect(pickNonRepeatingIndex(1, 0.8, 0)).toBe(0);
    expect(pickNonRepeatingIndex(4, 0.1, null)).toBe(0);
    expect(pickNonRepeatingIndex(4, Number.NaN, null)).toBe(0);
  });
});

describe("shouldSpawnTentacleBurst", () => {
  it("uses a per-placement probability gate", () => {
    expect(
      shouldSpawnTentacleBurst({
        placementNoise: 0.2,
        burstChance: 0.12,
      }),
    ).toBe(false);

    expect(
      shouldSpawnTentacleBurst({
        placementNoise: 0.08,
        burstChance: 0.12,
      }),
    ).toBe(true);
  });

  it("clamps invalid chance/noise inputs", () => {
    expect(
      shouldSpawnTentacleBurst({
        placementNoise: 0,
        burstChance: -3,
      }),
    ).toBe(false);

    expect(
      shouldSpawnTentacleBurst({
        placementNoise: 0.999,
        burstChance: 7,
      }),
    ).toBe(true);

    expect(
      shouldSpawnTentacleBurst({
        placementNoise: Number.NaN,
        burstChance: 0.9,
      }),
    ).toBe(false);
  });
});
