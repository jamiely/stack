export type DayNightPhase = "night" | "dawn" | "earlyMorning" | "noon" | "evening" | "sunset";

export interface DayNightFrame {
  skyTop: string;
  skyBottom: string;
  ambientIntensity: number;
  directionalIntensity: number;
  phase: DayNightPhase;
  starVisibility: number;
}

interface DayNightStop {
  t: number;
  phase: DayNightPhase;
  skyTop: string;
  skyBottom: string;
  ambientIntensity: number;
  directionalIntensity: number;
  starVisibility: number;
}

const DAY_NIGHT_STOPS: DayNightStop[] = [
  {
    t: 0,
    phase: "night",
    skyTop: "#0b1324",
    skyBottom: "#03060f",
    ambientIntensity: 0.8,
    directionalIntensity: 0.9,
    starVisibility: 0.85,
  },
  {
    t: 1 / 6,
    phase: "dawn",
    skyTop: "#2d3f6f",
    skyBottom: "#8a5b6d",
    ambientIntensity: 1.0,
    directionalIntensity: 1.2,
    starVisibility: 0.4,
  },
  {
    t: 2 / 6,
    phase: "earlyMorning",
    skyTop: "#5f85c9",
    skyBottom: "#f2ae7c",
    ambientIntensity: 1.25,
    directionalIntensity: 1.6,
    starVisibility: 0.08,
  },
  {
    t: 3 / 6,
    phase: "noon",
    skyTop: "#7ec3ff",
    skyBottom: "#d9f1ff",
    ambientIntensity: 1.9,
    directionalIntensity: 2.4,
    starVisibility: 0,
  },
  {
    t: 4 / 6,
    phase: "evening",
    skyTop: "#5c84c9",
    skyBottom: "#f2b07a",
    ambientIntensity: 1.35,
    directionalIntensity: 1.75,
    starVisibility: 0.1,
  },
  {
    t: 5 / 6,
    phase: "sunset",
    skyTop: "#2a2959",
    skyBottom: "#cf5f4d",
    ambientIntensity: 1.05,
    directionalIntensity: 1.25,
    starVisibility: 0.45,
  },
  {
    t: 1,
    phase: "night",
    skyTop: "#0b1324",
    skyBottom: "#03060f",
    ambientIntensity: 0.8,
    directionalIntensity: 0.9,
    starVisibility: 0.85,
  },
];

export function sampleDayNightFrame(stackHeight: number, blocksPerCycle: number): DayNightFrame {
  const safeBlocksPerCycle = Number.isFinite(blocksPerCycle) ? Math.max(4, blocksPerCycle) : 20;
  const safeHeight = Number.isFinite(stackHeight) ? stackHeight : 0;
  const normalizedHeight = ((safeHeight % safeBlocksPerCycle) + safeBlocksPerCycle) % safeBlocksPerCycle;
  const t = normalizedHeight / safeBlocksPerCycle;

  const segmentIndex = findSegmentIndex(t);
  const currentStop = DAY_NIGHT_STOPS[segmentIndex];
  const nextStop = DAY_NIGHT_STOPS[segmentIndex + 1];
  const segmentSpan = Math.max(0.0001, nextStop.t - currentStop.t);
  const localT = (t - currentStop.t) / segmentSpan;
  const easedT = smoothstep(clamp(localT, 0, 1));

  return {
    skyTop: lerpHex(currentStop.skyTop, nextStop.skyTop, easedT),
    skyBottom: lerpHex(currentStop.skyBottom, nextStop.skyBottom, easedT),
    ambientIntensity: lerp(currentStop.ambientIntensity, nextStop.ambientIntensity, easedT),
    directionalIntensity: lerp(currentStop.directionalIntensity, nextStop.directionalIntensity, easedT),
    starVisibility: lerp(currentStop.starVisibility, nextStop.starVisibility, easedT),
    phase: currentStop.phase,
  };
}

function findSegmentIndex(t: number): number {
  for (let i = 0; i < DAY_NIGHT_STOPS.length - 1; i += 1) {
    const start = DAY_NIGHT_STOPS[i].t;
    const end = DAY_NIGHT_STOPS[i + 1].t;
    const isLastSegment = i === DAY_NIGHT_STOPS.length - 2;
    if (t >= start && (t < end || isLastSegment)) {
      return i;
    }
  }
  return DAY_NIGHT_STOPS.length - 2;
}

function lerpHex(start: string, end: string, t: number): string {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  return rgbToHex({
    r: Math.round(lerp(startRgb.r, endRgb.r, t)),
    g: Math.round(lerp(startRgb.g, endRgb.g, t)),
    b: Math.round(lerp(startRgb.b, endRgb.b, t)),
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const fullHex = normalized.length === 3
    ? normalized
      .split("")
      .map((value) => `${value}${value}`)
      .join("")
    : normalized;

  const parsed = Number.parseInt(fullHex, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
