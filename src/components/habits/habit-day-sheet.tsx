import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, X } from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";

import { getMyHabitsForDay, markBadgesSeen, toggleHabitLog } from "../../services/HabitService";
import { IHabitBadge, IHabitDayResponse, IHabitForDay } from "../../interface/IHabit";
import { HabitRow } from "./habit-row";
import { BadgeUnlockDialog } from "./badge-unlock-dialog";
import { ConfettiFall, haptic } from "./habit-celebration";

const WIRE = "DD-MM-YYYY";

interface HabitDaySheetProps {
  /** DD-MM-YYYY, or null to keep the sheet closed. */
  day: string | null;
  onClose: () => void;
}

/**
 * Bottom sheet showing one day's habits.
 *
 * Editable for today and yesterday — the server returns CanLog and enforces the
 * same window, so this is a UI affordance rather than the actual guard. Older
 * days render as a read-only status list.
 */
export function HabitDaySheet({ day, onClose }: HabitDaySheetProps) {
  const queryClient = useQueryClient();
  const [badgeQueue, setBadgeQueue] = useState<IHabitBadge[]>([]);
  const [celebrating, setCelebrating] = useState(false);

  const { data, isLoading } = useQuery<IHabitDayResponse>({
    queryKey: ["my-habits-day", day],
    queryFn: () => getMyHabitsForDay({ Day: day! }).then((res) => res.data.data),
    enabled: !!day,
  });

  const toggle = useMutation({
    mutationFn: toggleHabitLog,
    onSuccess: (res) => {
      if (!res.data?.success) {
        toast.error(res.data?.message ?? "Couldn't save that");
        return;
      }
      const payload: IHabitDayResponse = res.data.data;
      queryClient.setQueryData(["my-habits-day", day], payload);
      // Editing any day moves the streak, the heatmap and today's card.
      queryClient.invalidateQueries({ queryKey: ["my-habits-today"] });
      queryClient.invalidateQueries({ queryKey: ["my-habit-history"] });
      queryClient.invalidateQueries({ queryKey: ["my-habit-stats"] });

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
  const canLog = data?.CanLog === true;

  const onToggle = (h: IHabitForDay) => {
    if (h.LinkedMetric) {
      toast(`"${h.Name}" ticks itself when you log your ${h.LinkedMetric.toLowerCase()}.`, { icon: "⚡" });
      return;
    }
    haptic(h.IsCompleted === 1 ? 8 : 15);
    toggle.mutate({ IdAssignment: h.IdAssignment, Day: day! });
  };

  const onStep = (h: IHabitForDay, delta: number) => {
    const next = Math.max(0, Math.min(h.TargetCount, h.CompletedCount + delta));
    if (next === h.CompletedCount) return;
    haptic(10);
    toggle.mutate({ IdAssignment: h.IdAssignment, Day: day!, CompletedCount: next });
  };

  return (
    <>
      {celebrating && <ConfettiFall />}
      <BadgeUnlockDialog badges={badgeQueue} onDismiss={dismissBadge} />

      <AnimatePresence>
        {day && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Habits on ${moment(day, WIRE).format("D MMMM YYYY")}`}
          >
            <motion.div
              className="max-h-[75vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-gray-900"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {moment(day, WIRE).calendar(null, {
                      sameDay: "[Today]",
                      lastDay: "[Yesterday]",
                      lastWeek: "dddd D MMMM",
                      sameElse: "dddd D MMMM",
                    })}
                  </p>
                  {!!data?.Summary && data.Summary.TotalHabits > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {data.Summary.CompletedHabits} of {data.Summary.TotalHabits} complete
                      {data.Summary.IsPerfectDay === 1 && " · perfect day 🏆"}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              ) : habits.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nothing was scheduled for this day.
                </p>
              ) : (
                <>
                  {!canLog && (
                    <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                      <Lock className="h-3 w-3 shrink-0" />
                      Locked — you can only edit today and yesterday.
                    </p>
                  )}
                  <ul className="pb-2">
                    {habits.map((h) => (
                      <HabitRow
                        key={h.IdAssignment}
                        habit={h}
                        onToggle={onToggle}
                        onStep={onStep}
                        busy={toggle.isPending}
                        readOnly={!canLog}
                      />
                    ))}
                  </ul>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
