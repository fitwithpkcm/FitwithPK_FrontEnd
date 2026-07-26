import React, { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Flame, History, Trophy } from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";

import { RENDER_URL } from "../../common/Urls";
import { getMyHabitsForDay, markBadgesSeen, toggleHabitLog } from "../../services/HabitService";
import { IHabitBadge, IHabitDayResponse, IHabitForDay } from "../../interface/IHabit";
import { ConfettiFall, ShimmerSweep, haptic } from "./habit-celebration";
import { BadgeUnlockDialog } from "./badge-unlock-dialog";
import { HabitRow } from "./habit-row";
import { HabitDaySheet } from "./habit-day-sheet";

const WIRE = "DD-MM-YYYY";

/**
 * "Today's habits" section for the student home page.
 *
 * Renders nothing at all when the coach hasn't assigned any habits, so the
 * home page is unchanged for students who aren't using the feature.
 */
export function HabitTodayCard() {
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const today = moment().format(WIRE);

  const yesterday = moment().subtract(1, "day").format(WIRE);

  const [badgeQueue, setBadgeQueue] = useState<IHabitBadge[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const [sheetDay, setSheetDay] = useState<string | null>(null);

  const { data, isLoading } = useQuery<IHabitDayResponse>({
    queryKey: ["my-habits-today", today],
    queryFn: () => getMyHabitsForDay({ Day: today }).then((res) => res.data.data),
  });

  // Yesterday is still inside the log window, so offer a way back to it —
  // otherwise a late-night tick is lost and the streak breaks unfairly.
  const { data: yesterdayData } = useQuery<IHabitDayResponse>({
    queryKey: ["my-habits-day", yesterday],
    queryFn: () => getMyHabitsForDay({ Day: yesterday }).then((res) => res.data.data),
  });
  const yesterdayMissed = (() => {
    const s = yesterdayData?.Summary;
    if (!s || s.TotalHabits === 0) return 0;
    return s.TotalHabits - s.CompletedHabits;
  })();

  // Badges earned while the app was closed (e.g. by a linked-metric auto-tick)
  // still get their celebration the next time the home page opens.
  React.useEffect(() => {
    if (data?.UnseenBadges?.length && badgeQueue.length === 0) setBadgeQueue(data.UnseenBadges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.UnseenBadges]);

  const toggle = useMutation({
    mutationFn: toggleHabitLog,
    onSuccess: (res) => {
      const payload: IHabitDayResponse | undefined = res.data?.data;
      if (!res.data?.success) {
        toast.error(res.data?.message ?? "Couldn't save that");
        return;
      }
      queryClient.setQueryData(["my-habits-today", today], payload);
      // Keep the home page's other cards honest — the streak pill and any
      // linked tracker may have moved.
      queryClient.invalidateQueries({ queryKey: ["my-habit-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-habit-history"] });

      if (payload?.Summary?.IsPerfectDay === 1) {
        setCelebrating(true);
        haptic([18, 60, 28]);
        window.setTimeout(() => setCelebrating(false), 3600);
      }
      if (payload?.NewBadges?.length) {
        window.setTimeout(() => setBadgeQueue((q) => [...q, ...payload.NewBadges!]), 850);
      }
    },
    onError: () => toast.error("Couldn't save that — try again"),
  });

  const seen = useMutation({ mutationFn: markBadgesSeen });

  const dismissBadge = () => {
    const done = badgeQueue[0];
    setBadgeQueue((q) => q.slice(1));
    if (done) seen.mutate([done.BadgeKey]);
  };

  const habits = data?.Habits ?? [];
  if (isLoading || habits.length === 0) return null;

  const completed = habits.filter((h) => h.IsCompleted === 1).length;
  const total = habits.length;
  const perfect = completed === total;
  const stats = data?.Stats;
  const pct = total === 0 ? 0 : completed / total;

  const onToggle = (h: IHabitForDay) => {
    if (h.LinkedMetric) {
      toast(`"${h.Name}" ticks itself when you log your ${h.LinkedMetric.toLowerCase()}.`, { icon: "⚡" });
      return;
    }
    haptic(h.IsCompleted === 1 ? 8 : 15);
    toggle.mutate({ IdAssignment: h.IdAssignment, Day: today });
  };

  const onStep = (h: IHabitForDay, delta: number) => {
    const next = Math.max(0, Math.min(h.TargetCount, h.CompletedCount + delta));
    if (next === h.CompletedCount) return;
    haptic(10);
    toggle.mutate({ IdAssignment: h.IdAssignment, Day: today, CompletedCount: next });
  };

  return (
    <>
      {celebrating && <ConfettiFall />}
      <BadgeUnlockDialog badges={badgeQueue} onDismiss={dismissBadge} />

      <motion.section
        className="relative mb-5 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        animate={perfect && !reduce ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.5 }}
        aria-labelledby="habits-today-heading"
      >
        {perfect && <ShimmerSweep />}

        <div className="relative flex items-center gap-3">
          <ProgressRing pct={pct} label={`${completed}/${total}`} perfect={perfect} />

          <div className="min-w-0 flex-1">
            <h2 id="habits-today-heading" className="text-base font-bold text-gray-900 dark:text-white">
              Today's habits
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {perfect
                ? "Every habit complete"
                : `${total - completed} to go — you've got this`}
            </p>
          </div>

          {!!stats?.CurrentStreak && (
            <motion.div
              key={stats.CurrentStreak}
              initial={reduce ? {} : { scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600 dark:bg-orange-950/50 dark:text-orange-400"
            >
              <Flame className="h-3.5 w-3.5" />
              {stats.CurrentStreak}
            </motion.div>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {perfect ? (
            <motion.div
              key="banner"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              className="mt-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-center text-white"
            >
              <Trophy className="mx-auto h-7 w-7" />
              <p className="mt-1.5 text-lg font-bold">Perfect day!</p>
              <p className="mt-0.5 text-xs text-white/90">
                All {total} habits done.
                {!!stats?.CurrentStreak && ` Streak now ${stats.CurrentStreak} day${stats.CurrentStreak === 1 ? "" : "s"}.`}
              </p>
            </motion.div>
          ) : (
            <motion.ul key="rows" className="mt-2" initial={false}>
              {habits.map((h) => (
                <HabitRow key={h.IdAssignment} habit={h} onToggle={onToggle} onStep={onStep} busy={toggle.isPending} />
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {yesterdayMissed > 0 && (
          <button
            type="button"
            onClick={() => setSheetDay(yesterday)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-50 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          >
            <History className="h-3.5 w-3.5" />
            Forgot yesterday? {yesterdayMissed} still open
          </button>
        )}

        <Link
          href={RENDER_URL.STUDENT_HABITS}
          className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400"
        >
          View streak &amp; badges <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </motion.section>

      <HabitDaySheet day={sheetDay} onClose={() => setSheetDay(null)} />
    </>
  );
}

// ── Pieces ────────────────────────────────────────────────────────

function ProgressRing({ pct, label, perfect }: { pct: number; label: string; perfect: boolean }) {
  const R = 16;
  const CIRC = 2 * Math.PI * R;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 40 40" className="h-14 w-14 -rotate-90">
        <circle cx="20" cy="20" r={R} fill="none" strokeWidth="4" className="stroke-gray-200 dark:stroke-gray-700" />
        <motion.circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={perfect ? "stroke-amber-400" : "stroke-blue-500"}
          strokeDasharray={CIRC}
          animate={{ strokeDashoffset: CIRC * (1 - pct) }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-white">
        {label}
      </div>
    </div>
  );
}
