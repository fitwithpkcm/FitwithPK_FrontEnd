import { useEffect } from "react";
import confetti from "canvas-confetti";

const GREENS = ["#22c55e", "#16a34a", "#4ade80", "#86efac"];

/** Fires a short two-sided green burst whenever `active` flips to true. */
export function Confetti({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const end = Date.now() + 700;
    let raf = 0;
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 72,
        startVelocity: 55,
        origin: { x: 0, y: 0.7 },
        colors: GREENS,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 72,
        startVelocity: 55,
        origin: { x: 1, y: 0.7 },
        colors: GREENS,
      });
      if (Date.now() < end) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return null;
}
