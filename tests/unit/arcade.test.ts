import { describe, expect, it } from "vitest";
import {
  ATTRACT_IDLE_SECONDS,
  AttractCycle,
  ButtonLatch,
  InitialsEntry,
  addHighScore,
  hiScore,
  highScores,
  qualifies,
} from "../../src/game/logic/arcade";

// Copied from Glowfall's src/rules/arcade.test.ts, retimed for the 0.35 s hold and Tower Stacker's attract pages.
describe("one-button initials", () => {
  it("taps to advance and holds to lock while still down, once per release", () => {
    const entry = new InitialsEntry(0);
    entry.down(0); entry.up(0.3); expect(entry.text).toBe("BAA");
    entry.down(1); entry.tick(1.34); expect(entry.index).toBe(0);
    entry.tick(1.35); expect(entry.index).toBe(1);
    entry.tick(2); expect(entry.index).toBe(1);
    entry.up(2); expect(entry.text).toBe("BAA");
    entry.down(3); entry.up(3.2); expect(entry.text).toBe("BBA");
  });
  it.each([true, false])("ignores duplicate keydowns repeat=%s without resetting a hold", (repeat) => {
    const entry = new InitialsEntry(0);
    entry.down(1); entry.down(1.1, repeat); entry.down(1.2, repeat);
    expect(entry.progress(1.2)).toBeCloseTo(0.2 / 0.35);
    expect(entry.text).toBe("AAA");
    entry.tick(1.36); expect(entry.index).toBe(1);
    entry.down(1.8, repeat); entry.up(2); expect(entry.index).toBe(1);
    expect(entry.text).toBe("AAA");
  });
  it("locks remaining letters as shown after ten idle seconds", () => {
    const entry = new InitialsEntry(0);
    entry.step(-1, 2); entry.tick(11.9); expect(entry.done).toBe(false);
    entry.tick(12); expect(entry.done).toBe(true); expect(entry.text).toBe("ZAA");
    entry.down(13); entry.up(13.1); entry.step(1, 14); expect(entry.text).toBe("ZAA");
    expect(entry.progress(13)).toBe(0);
  });
  it("locks all three letters with three holds", () => {
    const entry = new InitialsEntry(0);
    for (let letter = 0; letter < 3; letter += 1) {
      const t = letter * 2;
      entry.down(t); entry.up(t + 0.1);
      entry.down(t + 0.5); entry.tick(t + 0.9); entry.up(t + 1);
    }
    expect(entry.done).toBe(true);
    expect(entry.text).toBe("BBB");
  });
});

it("the button latch fires once per press and ignores key repeats", () => {
  const latch = new ButtonLatch();
  expect(latch.down()).toBe(true);
  expect(latch.down()).toBe(false);
  latch.up();
  expect(latch.down(true)).toBe(false);
  expect(latch.down()).toBe(true);
});

it("HI SCORE shows the saved best, or the live score once it is higher", () => {
  expect(hiScore([], 12)).toBe(12);
  expect(hiScore([{ initials: "AAA", score: 50 }], 12)).toBe(50);
  expect(hiScore([{ initials: "AAA", score: 50 }], 90)).toBe(90);
});

it("orders and trims the top ten; ties at the cutoff do not qualify", () => {
  let table = highScores(null);
  for (let score = 1; score <= 12; score++) table = addHighScore(table, { initials: "AAA", score });
  expect(table.map((v) => v.score)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
  expect(qualifies(table, 3)).toBe(false); expect(qualifies(table, 4)).toBe(true);
  expect(qualifies([], 0)).toBe(false); expect(qualifies([], 1)).toBe(true);
  expect(highScores([{ initials: "<b>", score: 99 }, { initials: "AAA", score: -1 }, null, { initials: "ABC", score: 1.5 }])).toEqual([]);
});

describe("attract cycle", () => {
  it("starts after the idle delay, rotates title → scores → how, and stops on input", () => {
    const cycle = new AttractCycle(0);
    cycle.tick(ATTRACT_IDLE_SECONDS - 0.1, true); expect(cycle.page).toBeNull();
    cycle.tick(ATTRACT_IDLE_SECONDS, true); expect(cycle.page).toBe("title");
    cycle.tick(ATTRACT_IDLE_SECONDS + 6, true); expect(cycle.page).toBe("scores");
    cycle.tick(ATTRACT_IDLE_SECONDS + 16, true); expect(cycle.page).toBe("how");
    cycle.tick(ATTRACT_IDLE_SECONDS + 24, true); expect(cycle.page).toBe("title");
    cycle.input(50); expect(cycle.page).toBeNull();
  });
  it("never runs while play or initials entry make it ineligible", () => {
    const cycle = new AttractCycle(0);
    cycle.tick(100, false); expect(cycle.page).toBeNull();
    cycle.tick(100 + ATTRACT_IDLE_SECONDS - 1, true); expect(cycle.page).toBeNull();
  });
});
