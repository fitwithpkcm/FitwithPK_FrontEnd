import React from "react";
import { habitColor, IHabitTrend } from "../../interface/IHabit";
import { HabitIcon } from "./habit-icon";

interface HabitTrendBarsProps {
  trends: IHabitTrend[];
  days: number;
}

/**
 * Per-habit consistency. The backend sorts worst-first on purpose: the habit
 * that's slipping is the one worth seeing at the top.
 */
export function HabitTrendBars({ trends, days }: HabitTrendBarsProps) {
  if (trends.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        No habits assigned yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500 dark:text-gray-400">Last {days} days</p>
      {trends.map((t) => {
        const c = habitColor(t.ColorKey);
        const bar =
          t.Percent >= 80 ? "bg-emerald-500" : t.Percent >= 50 ? "bg-amber-500" : "bg-red-500";

        return (
          <div key={t.IdAssignment}>
            <div className="mb-1 flex items-center gap-2">
              <span className={`shrink-0 ${c.text}`}>
                <HabitIcon name={t.Icon} className="h-4 w-4" />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                {t.Name}
              </p>
              <p className="shrink-0 text-xs font-bold text-gray-600 dark:text-gray-300">
                {t.CompletedDays}/{t.ScheduledDays}
                <span className="ml-1 font-normal text-gray-400">({t.Percent}%)</span>
              </p>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
              role="progressbar"
              aria-valuenow={t.Percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${t.Name} consistency`}
            >
              <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${t.Percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
