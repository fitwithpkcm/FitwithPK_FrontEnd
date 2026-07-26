import React from "react";
import moment from "moment";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IHabitDaySummary } from "../../interface/IHabit";

const WIRE = "DD-MM-YYYY";

interface HabitMonthCalendarProps {
  history: IHabitDaySummary[];
  onSelectDay?: (day: string) => void;
  selectedDay?: string | null;
}

/**
 * Month grid where each day is a ring filled in proportion to completion.
 * Hand-built rather than react-day-picker: the whole point is the per-day
 * progress ring, which DayPicker's cell API makes awkward.
 */
export function HabitMonthCalendar({ history, onSelectDay, selectedDay }: HabitMonthCalendarProps) {
  const [cursor, setCursor] = React.useState(() => moment().startOf("month"));

  const byDate = React.useMemo(() => {
    const m = new Map<string, IHabitDaySummary>();
    history.forEach((h) => m.set(h.LogDate, h));
    return m;
  }, [history]);

  const cells = React.useMemo(() => {
    const start = cursor.clone().startOf("month").startOf("isoWeek");
    const end = cursor.clone().endOf("month").endOf("isoWeek");
    const out: moment.Moment[] = [];
    const d = start.clone();
    while (d.isSameOrBefore(end, "day")) {
      out.push(d.clone());
      d.add(1, "day");
    }
    return out;
  }, [cursor]);

  const today = moment().startOf("day");
  const atCurrentMonth = cursor.isSame(moment().startOf("month"), "month");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor((c) => c.clone().subtract(1, "month"))}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-bold text-gray-900 dark:text-white">{cursor.format("MMMM YYYY")}</p>
        <button
          type="button"
          onClick={() => setCursor((c) => c.clone().add(1, "month"))}
          disabled={atCurrentMonth}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 disabled:opacity-30 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
          <div key={i} className="text-[10px] font-semibold text-gray-400">
            {l}
          </div>
        ))}

        {cells.map((d) => {
          const key = d.format(WIRE);
          const inMonth = d.isSame(cursor, "month");
          const future = d.isAfter(today, "day");
          const summary = byDate.get(key);
          const scheduled = !!summary && summary.TotalHabits > 0;
          const pct = scheduled ? summary!.CompletionPercent : 0;
          const isToday = d.isSame(today, "day");

          return (
            <button
              key={key}
              type="button"
              disabled={future || !inMonth}
              onClick={() => onSelectDay?.(key)}
              aria-label={
                scheduled
                  ? `${d.format("D MMMM")}, ${summary!.CompletedHabits} of ${summary!.TotalHabits} habits complete`
                  : `${d.format("D MMMM")}, nothing scheduled`
              }
              className={`relative flex aspect-square items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                !inMonth || future
                  ? "text-gray-300 dark:text-gray-700"
                  : "text-gray-800 dark:text-gray-100"
              } ${selectedDay === key ? "ring-2 ring-blue-500" : ""}`}
            >
              {inMonth && !future && (
                <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    strokeWidth="3"
                    strokeDasharray={scheduled ? undefined : "3 3"}
                    className={scheduled ? "stroke-gray-200 dark:stroke-gray-700" : "stroke-gray-200 dark:stroke-gray-800"}
                  />
                  {scheduled && pct > 0 && (
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 15}
                      strokeDashoffset={2 * Math.PI * 15 * (1 - pct / 100)}
                      className={pct >= 100 ? "stroke-amber-400" : "stroke-emerald-500"}
                    />
                  )}
                </svg>
              )}
              <span className={`relative ${isToday ? "underline decoration-2 underline-offset-2" : ""}`}>
                {d.format("D")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
