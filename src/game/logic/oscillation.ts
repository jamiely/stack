import type { Axis } from "../types";

export interface OscillationState {
  axis: Axis;
  offset: number;
  direction: 1 | -1;
  center: number;
}

export function advanceOscillation(
  state: OscillationState,
  deltaSeconds: number,
  speed: number,
  range: number,
): OscillationState {
  const distance = speed * deltaSeconds * state.direction;
  const nextOffset = state.offset + distance;
  const minBound = state.center - range;
  const maxBound = state.center + range;

  if (nextOffset >= minBound && nextOffset <= maxBound) {
    return { ...state, offset: nextOffset };
  }

  const overshoot = nextOffset > maxBound ? nextOffset - maxBound : minBound - nextOffset;
  const bouncedDirection = (state.direction * -1) as 1 | -1;
  const boundedOffset = bouncedDirection === -1 ? maxBound - overshoot : minBound + overshoot;

  return {
    ...state,
    offset: boundedOffset,
    direction: bouncedDirection,
  };
}

export function getAxisPosition(axis: Axis, offset: number): { x: number; z: number } {
  return axis === "x" ? { x: offset, z: 0 } : { x: 0, z: offset };
}
