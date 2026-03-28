import { describe, expect, it } from "vitest";
import { createSeededRandom, normalizeSeed } from "../../src/game/logic/random";

describe("normalizeSeed", () => {
  it("normalizes zero to a non-zero default", () => {
    expect(normalizeSeed(0)).toBe(0x1a2b3c4d);
  });

  it("truncates floating seed values", () => {
    expect(normalizeSeed(123.99)).toBe(123);
  });
});

describe("createSeededRandom", () => {
  it("produces deterministic sequences for the same seed", () => {
    const first = createSeededRandom(42);
    const second = createSeededRandom(42);

    const firstSequence = [first(), first(), first(), first()];
    const secondSequence = [second(), second(), second(), second()];

    expect(firstSequence).toEqual(secondSequence);
  });

  it("produces values in [0, 1)", () => {
    const rng = createSeededRandom(99);

    for (let index = 0; index < 20; index += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
