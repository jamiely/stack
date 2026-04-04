import { describe, expect, it } from "vitest";
import {
  hasRecentTentacleBurstOnFace,
  shouldKeepCurrentRemyAnchor,
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
