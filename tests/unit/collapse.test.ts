import { describe, expect, it } from "vitest";
import {
  advanceCollapseSequence,
  createCollapseSequence,
  sampleCollapseFrame,
  shouldTriggerCollapse,
} from "../../src/game/logic/collapse";

describe("collapse logic", () => {
  it("triggers collapse on hard miss or unstable integrity tier", () => {
    expect(shouldTriggerCollapse("miss", "stable")).toBe(true);
    expect(shouldTriggerCollapse("landed", "unstable")).toBe(true);
    expect(shouldTriggerCollapse("perfect", "precarious")).toBe(false);
  });

  it("normalizes collapse direction from telemetry offset", () => {
    const sequence = createCollapseSequence(
      "instability",
      { x: 2, z: 2 },
      {
        durationSeconds: 1.2,
        tiltStrength: 0.7,
        pullbackDistance: 4,
        dropDistance: 2.5,
      },
    );

    expect(sequence.direction.x).toBeCloseTo(Math.SQRT1_2, 6);
    expect(sequence.direction.z).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it("falls back to minimum-safe collapse config values and default direction", () => {
    const sequence = createCollapseSequence(
      "miss",
      { x: 0, z: 0 },
      {
        durationSeconds: 0.1,
        tiltStrength: -1,
        pullbackDistance: -4,
        dropDistance: -2,
      },
    );

    expect(sequence.durationSeconds).toBe(0.3);
    expect(sequence.tiltStrength).toBe(0.05);
    expect(sequence.pullbackDistance).toBe(0);
    expect(sequence.dropDistance).toBe(0);
    expect(sequence.direction).toEqual({ x: 1, z: 0 });
  });

  it("advances and samples deterministic collapse presentation values", () => {
    const sequence = createCollapseSequence(
      "miss",
      { x: 3, z: 0 },
      {
        durationSeconds: 1,
        tiltStrength: 0.8,
        pullbackDistance: 5,
        dropDistance: 3,
      },
    );

    const halfFrame = sampleCollapseFrame(advanceCollapseSequence(sequence, 0.5));
    const completeFrame = sampleCollapseFrame(advanceCollapseSequence(sequence, 5));

    expect(halfFrame.completed).toBe(false);
    expect(halfFrame.progress).toBeCloseTo(0.5, 6);
    expect(halfFrame.stackTiltZ).toBeLessThan(0);
    expect(halfFrame.cameraPullback).toBeGreaterThan(0);

    expect(completeFrame.completed).toBe(true);
    expect(completeFrame.progress).toBe(1);
    expect(completeFrame.stackDropY).toBeCloseTo(3, 6);
    expect(completeFrame.cameraPullback).toBeCloseTo(5, 6);
  });

  it("ignores negative delta time while sampling still clamps to the valid range", () => {
    const sequence = createCollapseSequence(
      "instability",
      { x: 0, z: 3 },
      {
        durationSeconds: 1,
        tiltStrength: 0.5,
        pullbackDistance: 4,
        dropDistance: 2,
      },
    );

    const rewound = advanceCollapseSequence(sequence, -5);
    const frame = sampleCollapseFrame({
      ...rewound,
      elapsedSeconds: -1,
    });

    expect(rewound.elapsedSeconds).toBe(0);
    expect(frame.progress).toBe(0);
    expect(frame.completed).toBe(false);
    expect(frame.stackTiltX).toBeCloseTo(0, 6);
    expect(frame.stackTiltZ).toBeCloseTo(0, 6);
  });
});
