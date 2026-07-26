import React from "react";
import { Award, Lock } from "lucide-react";
import moment from "moment";
import { IHabitBadge, tierStyle } from "../../interface/IHabit";

interface BadgeShelfProps {
  earned: IHabitBadge[];
  locked: IHabitBadge[];
}

/**
 * Earned badges in colour, locked ones greyed with their unlock condition.
 * Showing the locked set is deliberate — a visible goal motivates far better
 * than a surprise reward.
 */
export function BadgeShelf({ earned, locked }: BadgeShelfProps) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Earned · {earned.length}
        </h3>
        {earned.length === 0 ? (
          <p className="rounded-xl bg-gray-50 py-6 text-center text-sm text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
            No badges yet. Complete all of today's habits to earn your first.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {earned.map((b) => {
              const t = tierStyle(b.Tier);
              return (
                <div
                  key={b.BadgeKey}
                  className={`flex flex-col items-center rounded-xl border p-3 text-center ${t.bg} ${t.border}`}
                >
                  <Award className={`h-7 w-7 ${t.text}`} />
                  <p className="mt-1.5 text-[11px] font-bold leading-tight text-gray-900 dark:text-white">
                    {b.Label}
                  </p>
                  {!!b.EarnedDate && (
                    <p className="mt-0.5 text-[9px] text-gray-500 dark:text-gray-400">
                      {moment(b.EarnedDate, "DD-MM-YYYY").format("D MMM YY")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {locked.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Locked · {locked.length}
          </h3>
          <div className="space-y-1.5">
            {locked.map((b) => (
              <div
                key={b.BadgeKey}
                className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <Lock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{b.Label}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{b.Unlock}</p>
                </div>
                <span className="shrink-0 text-[9px] font-bold uppercase text-gray-400">
                  {tierStyle(b.Tier).label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
