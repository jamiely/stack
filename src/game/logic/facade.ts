import { sampleDecorNoise } from "./decor";

export type FacadeStyle = "smooth" | "brick" | "siding";

export function resolveFacadeStyle(level: number): FacadeStyle {
  const noise = sampleDecorNoise(level * 0.73 + 11.2, 9.17);
  if (noise < 0.34) {
    return "brick";
  }

  if (noise < 0.68) {
    return "siding";
  }

  return "smooth";
}
