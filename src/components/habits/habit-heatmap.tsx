import React from "react";
import moment from "moment";
import { HEAT_CLASSES, heatLevel, IHabitDaySummary } from "../../interface/IHabit";

const WIRE = "DD-MM-YYYY";

interface HabitHeatmapProps {
  history: IHabitDaySummary[];
  /** Number of weeks to show. 12 fits a phone width comfortably. */
  weeks?: number;
  onSelectDay?: (day: string) => void;
  selectedDay?: string | null;
}

/**
 * GitHub-style contribution grid: one column per week, one cell per day.
 *
 * Days with nothing scheduled render as a hollow outline rather than an empty
 * "missed" cell — otherwise a Mon/Wed/Fri plan looks like constant failure.
 */
export function HabitHeatmap({ history, weeks = 12, onSelectDay, selectedDay }: HabitHeatmapProps) {
  const byDate = React.useMemo(() => {
    const m = new Map<string, IHabitDaySummary>();
    history.forEach((h) => m.set(h.LogDate, h));
    return m;
  }, [history]);

  // Columns run oldest → newest, each starting on Monday.
  const columns = React.useMemo(() => {
    const endOfWeek = moment().endOf("isoWeek");
    return Array.from({ length: weeks }, (_, w) => {
      const monday = endOfWeek.clone().subtract(weeks - 1 - w, "weeks").startOf("isoWeek");
      return Array.from({ length: 7 }, (_, d) => monday.clone().add(d, "days"));
    });
  }, [weeks]);

  const today = moment().startOf("day");

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {/* Weekday gutter — only M/W/F labelled, or it gets noisy at this size. */}
        <div className="mr-1 flex shrink-0 flex-col gap-[3px]">
          {["M", "", "W", "", "F", "", ""].map((l, i) => (
            <div key={i} className="flex h-3.5 w-3 items-center text-[8px] text-gray-400">
              {l}
            </div>
          ))}
        </div>

        {columns.map((week, wi) => (
          <div key={wi} className="flex shrink-0 flex-col gap-[3px]">
            {week.map((d) => {
              const key = d.format(WIRE);
              const future = d.isAfter(today, "day");
              const summary = byDate.get(key);
              const restDay = !summary || summary.TotalHabits === 0;
              const level = heatLevel(summary);
              const isSelected = selectedDay === key;

              if (future) return <div key={key} className="h-3.5 w-3.5" />;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectDay?.(key)}
                  title={
                    restDay
                      ? `${d.format("ddd D MMM")} — nothing scheduled`
                      : `${d.format("ddd D MMM")} — ${summary!.CompletedHabits}/${summary!.TotalHabits} habits`
                  }
                  aria-label={
                    restDay
                      ? `${d.format("D MMMM")}, nothing scheduled`
                      : `${d.format("D MMMM")}, ${summary!.CompletedHabits} of ${summary!.TotalHabits} habits complete`
                  }
                  className={`h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-125 ${
                    restDay
                      ? "border border-dashed border-gray-300 dark:border-gray-700"
                      : HEAT_CLASSES[level]
                  } ${isSelected ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5 text-[9px] text-gray-400">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`h-2.5 w-2.5 rounded-[2px] ${HEAT_CLASSES[l]}`} />
        ))}
        <span>More</span>
        <span className="ml-2 h-2.5 w-2.5 rounded-[2px] border border-dashed border-gray-300 dark:border-gray-700" />
        <span>Rest</span>
      </div>
    </div>
  );
}
