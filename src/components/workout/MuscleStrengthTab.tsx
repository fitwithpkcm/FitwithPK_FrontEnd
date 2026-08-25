import React from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { getMuscleGroupSetHistory } from "../../services/WorkoutService";
import { IMuscleSetHistoryRow } from "../../interface/IWorkout";
import { computeExerciseStrength, ExerciseStrengthResult } from "../../lib/workout/muscleAnalytics";

function daysAgoLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function MuscleStrengthTab({ idUser, rangeDays, rangeLabel }: {
  idUser?: number;
  rangeDays: number | null;
  rangeLabel: string;
}) {
  // Fetch double the selected range so the prior period is available for the
  // trend delta in one round trip; null (All) means no date filter at all.
  const fetchDays = rangeDays != null ? rangeDays * 2 : null;
  const { data: res, isLoading } = useQuery({
    queryKey: ["muscle-set-history", "strength", idUser, fetchDays],
    queryFn: () => getMuscleGroupSetHistory({ IdUser: idUser, days: fetchDays }),
    staleTime: 60_000,
  });
  const rowsData = res?.data?.data;
  const rows: IMuscleSetHistoryRow[] = Array.isArray(rowsData) ? rowsData : [];
  const results = computeExerciseStrength(rows, rangeDays);

  // group by MuscleGroup, sections ordered by their most-recently-trained
  // exercise; exercises within a section sorted the same way.
  const byMuscle = new Map<string, ExerciseStrengthResult[]>();
  for (const r of results) {
    const list = byMuscle.get(r.MuscleGroup) ?? [];
    list.push(r);
    byMuscle.set(r.MuscleGroup, list);
  }
  const sections = [...byMuscle.entries()]
    .map(([muscleGroup, exercises]) => ({
      muscleGroup,
      exercises: [...exercises].sort((a, b) => a.LastTrainedDaysAgo - b.LastTrainedDaysAgo),
      minDaysAgo: Math.min(...exercises.map(e => e.LastTrainedDaysAgo)),
    }))
    .sort((a, b) => a.minDaysAgo - b.minDaysAgo);

  return (
    <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
      <CardHeader className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Est. Strength · by exercise</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Your lifts over {rangeLabel === "All" ? "all time" : rangeLabel.toLowerCase()}, each compared to itself over time — not muscle vs. muscle.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : sections.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No weighted sets logged {rangeLabel === "All" ? "yet" : `over ${rangeLabel.toLowerCase()}`}.</p>
        ) : (
          <div className="space-y-5">
            {sections.map(section => (
              <div key={section.muscleGroup}>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">{section.muscleGroup}</p>
                <div className="space-y-2.5">
                  {section.exercises.map(ex => (
                    <div key={ex.ExerciseName} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{ex.ExerciseName}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Last trained {daysAgoLabel(ex.LastTrainedDaysAgo)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {ex.Best1RM != null ? `Est. 1RM: ${Math.round(ex.Best1RM)}kg` : "Bodyweight"}
                        </span>
                        {ex.DeltaPct != null && (
                          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${ex.DeltaPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                            {ex.DeltaPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(ex.DeltaPct)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
