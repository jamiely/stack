import { describe, expect, it } from "vitest";
import { sampleDayNightFrame } from "../../src/game/logic/dayNight";

describe("dayNight", () => {
  it("cycles lighting between darker and brighter phases", () => {
    const night = sampleDayNightFrame(0, 60);
    const day = sampleDayNightFrame(30, 60);
    expect(day.ambientIntensity).toBeGreaterThan(night.ambientIntensity);
    expect(day.directionalIntensity).toBeGreaterThan(night.directionalIntensity);
  });

  it("moves through the expected phase order", () => {
    const cycleBlocks = 60;
    expect(sampleDayNightFrame(0, cycleBlocks).phase).toBe("night");
    expect(sampleDayNightFrame(10, cycleBlocks).phase).toBe("dawn");
    expect(sampleDayNightFrame(20, cycleBlocks).phase).toBe("earlyMorning");
    expect(sampleDayNightFrame(30, cycleBlocks).phase).toBe("noon");
    expect(sampleDayNightFrame(40, cycleBlocks).phase).toBe("evening");
    expect(sampleDayNightFrame(50, cycleBlocks).phase).toBe("sunset");
  });

  it("eases lighting across phase boundaries without abrupt jumps", () => {
    const cycleBlocks = 60;
    const beforeBoundary = sampleDayNightFrame(9.5, cycleBlocks);
    const atBoundary = sampleDayNightFrame(10, cycleBlocks);
    const afterBoundary = sampleDayNightFrame(10.5, cycleBlocks);

    const jumpIntoBoundary = Math.abs(atBoundary.ambientIntensity - beforeBoundary.ambientIntensity);
    const jumpOutBoundary = Math.abs(afterBoundary.ambientIntensity - atBoundary.ambientIntensity);

    expect(jumpIntoBoundary).toBeLessThan(0.08);
    expect(jumpOutBoundary).toBeLessThan(0.08);
  });

  it("makes stars most visible at night and fades them through the day", () => {
    const cycleBlocks = 60;
    const night = sampleDayNightFrame(0, cycleBlocks);
    const dawn = sampleDayNightFrame(10, cycleBlocks);
    const noon = sampleDayNightFrame(30, cycleBlocks);
    const sunset = sampleDayNightFrame(50, cycleBlocks);

    expect(night.starVisibility).toBeGreaterThan(dawn.starVisibility);
    expect(dawn.starVisibility).toBeGreaterThan(noon.starVisibility);
    expect(sunset.starVisibility).toBeGreaterThan(noon.starVisibility);
    expect(noon.starVisibility).toBeLessThanOrEqual(0.02);
  });

  it("peaks flare strength near noon and fades away from midday", () => {
    const cycleBlocks = 60;
    const dawn = sampleDayNightFrame(10, cycleBlocks);
    const earlyMorning = sampleDayNightFrame(20, cycleBlocks);
    const noon = sampleDayNightFrame(30, cycleBlocks);
    const evening = sampleDayNightFrame(40, cycleBlocks);
    const night = sampleDayNightFrame(0, cycleBlocks);

    expect(noon.noonFlareStrength).toBeGreaterThan(0.95);
    expect(earlyMorning.noonFlareStrength).toBeLessThan(noon.noonFlareStrength);
    expect(evening.noonFlareStrength).toBeLessThan(noon.noonFlareStrength);
    expect(dawn.noonFlareStrength).toBeLessThanOrEqual(0.02);
    expect(night.noonFlareStrength).toBeLessThanOrEqual(0.02);
  });
});
