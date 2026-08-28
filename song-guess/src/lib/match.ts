// Loose title comparison so a free-typed guess still counts.

const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalizeTitle(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/\b(feat|ft|featuring)\b.*$/i, " ")
    .replace(/-\s*(radio edit|remaster(ed)?|.*?version|single version|mono|stereo|live).*$/i, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export interface Answer {
  trackId: number;
  title: string;
}

/** True when the guess is close enough to the answer's title. */
export function isCorrectGuess(guess: { trackId?: number; text: string }, answer: Answer): boolean {
  if (guess.trackId && guess.trackId === answer.trackId) return true;

  const g = normalizeTitle(guess.text);
  const t = normalizeTitle(answer.title);
  if (!g || !t) return false;
  if (g === t) return true;
  if (t.length >= 6 && (g.includes(t) || t.includes(g))) return true;

  const ratio = 1 - levenshtein(g, t) / Math.max(g.length, t.length);
  return ratio >= 0.85;
}
