import { motion, useReducedMotion } from "framer-motion";
import React from "react";

const COLORS = ["#fbbf24", "#10b981", "#3b82f6", "#ec4899", "#a855f7", "#f97316"];

/**
 * Full-screen confetti fall for a perfect day.
 *
 * Rendered as a fixed, pointer-events-none overlay so it can rain over the
 * whole app without capturing taps. Respects prefers-reduced-motion by
 * rendering nothing at all — some people get motion sick from falling confetti.
 */
export function ConfettiFall({ count = 70, duration = 3.2 }: { count?: number; duration?: number }) {
  const reduce = useReducedMotion();

  // Deterministic pseudo-random so pieces don't reshuffle on re-render.
  // Computed before the early return — hooks must run in the same order every time.
  const pieces = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: ((i * 37) % 100),
        delay: ((i * 13) % 100) / 100 * 0.9,
        size: 6 + ((i * 7) % 7),
        color: COLORS[i % COLORS.length],
        drift: (((i * 29) % 80) - 40),
        spin: (((i * 53) % 720) - 360),
        round: i % 3 === 0,
      })),
    [count]
  );

  if (reduce) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          initial={{ y: "-10vh", x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", x: p.drift, opacity: [1, 1, 0.9, 0], rotate: p.spin }}
          transition={{ duration, delay: p.delay, ease: [0.2, 0.6, 0.5, 1] }}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.round ? "50%" : 2,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Gold shimmer that sweeps once across the card. Purely decorative, so it sits
 * behind an aria-hidden wrapper and disappears under reduced motion.
 */
export function ShimmerSweep({ duration = 1.1 }: { duration?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
      <motion.div
        initial={{ x: "-120%" }}
        animate={{ x: "120%" }}
        transition={{ duration, ease: "easeInOut" }}
        className="absolute inset-y-0 w-1/2 skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/20"
      />
    </div>
  );
}

/** Short double-pulse on completion. Silently ignored where unsupported (iOS). */
export const haptic = (pattern: number | number[] = 15) => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* no-op */
  }
};
