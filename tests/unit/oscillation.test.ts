import { describe, expect, it } from "vitest";
import { advanceOscillation, getAxisPosition } from "../../src/game/logic/oscillation";

describe("advanceOscillation", () => {
  it("moves the slab within range without flipping direction", () => {
    expect(
      advanceOscillation(
        { axis: "x", offset: 0, direction: 1, center: 0 },
        0.5,
        2,
        4,
      ),
    ).toEqual({ axis: "x", offset: 1, direction: 1, center: 0 });
  });

  it("bounces and preserves overshoot when it crosses the range bound", () => {
    expect(
      advanceOscillation(
        { axis: "z", offset: 3.8, direction: 1, center: 0 },
        0.5,
        2,
        4,
      ),
    ).toEqual({ axis: "z", offset: 3.2, direction: -1, center: 0 });
  });

  it("bounces correctly when crossing the negative bound", () => {
    const result = advanceOscillation(
      { axis: "x", offset: -3.9, direction: -1, center: 0 },
      0.25,
      2,
      4,
    );

    expect(result.axis).toBe("x");
    expect(result.direction).toBe(1);
    expect(result.offset).toBeCloseTo(-3.6);
  });

  it("supports oscillation around a non-zero center", () => {
    const result = advanceOscillation(
      { axis: "x", offset: 5.9, direction: 1, center: 2 },
      0.25,
      2,
      4,
    );

    expect(result.offset).toBeCloseTo(5.6);
    expect(result.direction).toBe(-1);
    expect(result.center).toBe(2);
  });
});

describe("getAxisPosition", () => {
  it("maps x-axis motion to the x coordinate", () => {
    expect(getAxisPosition("x", 1.5)).toEqual({ x: 1.5, z: 0 });
  });

  it("maps z-axis motion to the z coordinate", () => {
    expect(getAxisPosition("z", -2)).toEqual({ x: 0, z: -2 });
  });
});
