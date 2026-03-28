export type RandomFn = () => number;

export function createSeededRandom(seed: number): RandomFn {
  let state = normalizeSeed(seed);

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeSeed(seed: number): number {
  const normalized = Math.trunc(seed) | 0;
  return normalized === 0 ? 0x1a2b3c4d : normalized;
}
