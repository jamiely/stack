import { describe, expect, it } from "vitest";
import { sampleDayNightFrame } from "../../src/game/logic/dayNight";

describe("dayNight", () => {
  it("cycles lighting between darker and brighter phases", () => {
    const night = sampleDayNightFrame(0, 60);
    const day = sampleDayNightFrame(30, 60);
    expect(day.ambientIntensity).toBeGreaterThan(night.ambientIntensity);
    expect(day.directionalIntensity).toBeGreaterThan(night.directionalIntensity);
  });
});
