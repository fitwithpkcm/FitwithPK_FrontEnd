import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Award } from "lucide-react";
import { Button } from "../ui/button";
import { IHabitBadge, tierStyle } from "../../interface/IHabit";

interface BadgeUnlockDialogProps {
  /** Queue of freshly-earned badges — shown one at a time. */
  badges: IHabitBadge[];
  onDismiss: () => void;
}

/**
 * Celebration modal for a newly-earned badge. Shows the first badge in the
 * queue; the parent pops it on dismiss so multiple unlocks play in sequence
 * rather than stacking on top of each other.
 */
export function BadgeUnlockDialog({ badges, onDismiss }: BadgeUnlockDialogProps) {
  const reduce = useReducedMotion();
  const badge = badges[0];

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-unlock-title"
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 text-center shadow-2xl"
            initial={reduce ? { opacity: 0 } : { y: 60, opacity: 0, scale: 0.9 }}
            animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="relative mx-auto h-24 w-24">
              <motion.div
                className={`flex h-24 w-24 items-center justify-center rounded-full border-2 ${tierStyle(badge.Tier).bg} ${tierStyle(badge.Tier).border} shadow-lg ${tierStyle(badge.Tier).glow}`}
                initial={reduce ? {} : { scale: 0, rotate: -25 }}
                animate={reduce ? {} : { scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
              >
                <Award className={`h-11 w-11 ${tierStyle(badge.Tier).text}`} />
              </motion.div>

              {/* Shine sweep across the medal */}
              {!reduce && (
                <div aria-hidden className="absolute inset-0 overflow-hidden rounded-full">
                  <motion.div
                    className="absolute inset-y-0 w-1/2 skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                    initial={{ x: "-150%" }}
                    animate={{ x: "150%" }}
                    transition={{ duration: 0.9, delay: 0.45, ease: "easeInOut" }}
                  />
                </div>
              )}
            </div>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Badge unlocked · {tierStyle(badge.Tier).label}
            </p>
            <h3 id="badge-unlock-title" className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {badge.Label}
            </h3>
            <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">{badge.Description}</p>

            <Button className="mt-5 w-full" onClick={onDismiss}>
              {badges.length > 1 ? `Next (${badges.length - 1} more)` : "Nice"}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
