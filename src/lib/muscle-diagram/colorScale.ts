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

// red -> amber -> green, all fully saturated. Used for the ranked-list bar
// fill and its label text, where magnitude is already conveyed by bar
// length — a legible, stoplight-style color at every value is what you want
// for text/bars, same convention as any progress-bar UI.
const TARGET_STOPS: RGB[] = [[239, 68, 68], [245, 158, 11], [16, 185, 129]];
export const targetColor = (pct: number) => lerpColor(pct, TARGET_STOPS);

// pale red -> amber -> bold green. Used for the body-diagram fill, which has
// no "length" to show magnitude — color intensity is the only signal there,
// so a fully-saturated red at 0% used to read as "strong"/"intense" at a
// glance regardless of what it meant. Visual boldness now tracks progress
// itself (faint = barely trained, bold = on target), so a muscle far behind
// its goal recedes instead of visually dominating the diagram.
const TARGET_DIAGRAM_STOPS: RGB[] = [[254, 205, 205], [245, 158, 11], [5, 150, 105]];
export const targetDiagramColor = (pct: number) => lerpColor(pct, TARGET_DIAGRAM_STOPS);

// green -> amber -> red (inverted target scale). Used where high = needs attention.
const FATIGUE_STOPS: RGB[] = [[16, 185, 129], [245, 158, 11], [239, 68, 68]];
export const fatigueColor = (pct: number) => lerpColor(pct, FATIGUE_STOPS);
