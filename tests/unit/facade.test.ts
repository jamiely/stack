import { describe, expect, it } from "vitest";
import { resolveFacadeStyle } from "../../src/game/logic/facade";

describe("facade styles", () => {
  it("deterministically resolves smooth/brick/siding styles", () => {
    const styles = Array.from({ length: 20 }, (_, level) => resolveFacadeStyle(level));
    expect(styles.some((style) => style === "brick")).toBe(true);
    expect(styles.some((style) => style === "siding")).toBe(true);
    expect(styles.some((style) => style === "smooth")).toBe(true);
    expect(resolveFacadeStyle(7)).toBe(resolveFacadeStyle(7));
  });
});
