// Continuous color scales for the muscle-diagram gradients (Muscle Balance,
// Fatigue, Strength tabs) — a plain 0-100 percentage in, a hex color out.
// pct is clamped to [0,100] before interpolating.

type RGB = [number, number, number];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function toHex(rgb: RGB): string {
  return "#" + rgb.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("");
}

// Interpolates across an arbitrary number of evenly-spaced stops.
export function lerpColor(pct: number, stops: RGB[]): string {
  const p = Math.max(0, Math.min(100, pct)) / 100;
  const segments = stops.length - 1;
  const pos = p * segments;
  const i = Math.min(segments - 1, Math.floor(pos));
  const t = pos - i;
  const rgb: RGB = [
    lerp(stops[i][0], stops[i + 1][0], t),
    lerp(stops[i][1], stops[i + 1][1], t),
    lerp(stops[i][2], stops[i + 1][2], t),
  ];
  return toHex(rgb);
}

// red -> amber -> green. Used where the meaning is "progress toward a goal".
const TARGET_STOPS: RGB[] = [[239, 68, 68], [245, 158, 11], [16, 185, 129]];
export const targetColor = (pct: number) => lerpColor(pct, TARGET_STOPS);

// green -> amber -> red (inverted target scale). Used where high = needs attention.
const FATIGUE_STOPS: RGB[] = [[16, 185, 129], [245, 158, 11], [239, 68, 68]];
export const fatigueColor = (pct: number) => lerpColor(pct, FATIGUE_STOPS);

// pale -> deep blue. Purely descriptive ranking, no good/bad judgment implied.
const STRENGTH_STOPS: RGB[] = [[219, 234, 254], [37, 99, 235]];
export const strengthColor = (pct: number) => lerpColor(pct, STRENGTH_STOPS);
