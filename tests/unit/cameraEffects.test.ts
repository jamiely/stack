import { describe, expect, it } from "vitest";
import {
  resolveCharacterFramingLookAtX,
  resolveResponsiveCameraDistance,
  samplePlacementCameraShake,
  sampleTremorCameraShake,
} from "../../src/game/logic/cameraEffects";

describe("cameraEffects", () => {
  it("pulls the camera back only for mobile portrait viewports", () => {
    expect(resolveResponsiveCameraDistance(12, 390 / 844)).toBe(18);
    expect(resolveResponsiveCameraDistance(12, 0.75)).toBe(18);
    expect(resolveResponsiveCameraDistance(12, 0.7501)).toBe(12);
    expect(resolveResponsiveCameraDistance(14, 390 / 844)).toBe(20);
    expect(resolveResponsiveCameraDistance(12, 844 / 390)).toBe(12);
    expect(resolveResponsiveCameraDistance(12, 1280 / 720)).toBe(12);
  });

  it("falls back safely for invalid camera distances and viewport aspects", () => {
    expect(resolveResponsiveCameraDistance(Number.NaN, 390 / 844)).toBe(18);
    expect(resolveResponsiveCameraDistance(Number.POSITIVE_INFINITY, 390 / 844)).toBe(18);
    expect(resolveResponsiveCameraDistance(12, Number.NaN)).toBe(12);
    expect(resolveResponsiveCameraDistance(12, 0)).toBe(12);
    expect(resolveResponsiveCameraDistance(12, -1)).toBe(12);
  });

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

  it("pulls a far-right character into frame on narrow mobile screens", () => {
    expect(resolveCharacterFramingLookAtX(4.93, 390 / 844)).toBeCloseTo(2.43, 2);
  });

  it("keeps normal tower framing on wide screens and for central characters", () => {
    expect(resolveCharacterFramingLookAtX(4.93, 1)).toBe(0);
    expect(resolveCharacterFramingLookAtX(1.2, 390 / 844)).toBe(0);
    expect(resolveCharacterFramingLookAtX(null, 390 / 844)).toBe(0);
  });
});
