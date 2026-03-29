export interface DayNightFrame {
  skyTop: string;
  skyBottom: string;
  ambientIntensity: number;
  directionalIntensity: number;
}

export function sampleDayNightFrame(elapsedSeconds: number, cycleDurationSeconds: number): DayNightFrame {
  const duration = Math.max(20, cycleDurationSeconds);
  const phase = ((elapsedSeconds % duration) + duration) % duration;
  const t = phase / duration;
  const sun = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;

  const ambientIntensity = 0.9 + sun * 1.1;
  const directionalIntensity = 1 + sun * 1.4;

  const top = sun > 0.5 ? "#6aa7ff" : "#0f1b31";
  const bottom = sun > 0.5 ? "#f2b66f" : "#050912";

  return {
    skyTop: top,
    skyBottom: bottom,
    ambientIntensity,
    directionalIntensity,
  };
}
