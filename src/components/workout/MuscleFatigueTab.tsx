import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "../ui/card";
import { getMuscleGroupSetHistory } from "../../services/WorkoutService";
import { IMuscleSetHistoryRow } from "../../interface/IWorkout";
import { FRONT_PATHS, BACK_PATHS, FRONT_VIEWBOX, BACK_VIEWBOX, muscleGroupPctBySlug } from "../../lib/muscle-diagram/paths";
import { fatigueColor } from "../../lib/muscle-diagram/colorScale";
import { computeFatigue } from "../../lib/workout/muscleAnalytics";
import BodySvg from "./BodySvg";

// Fixed lookback, independent of the page's Week/30d/90d/All range — fatigue
// is about "right now," not a chosen history window. 30 days is generous
// enough to still caption "last trained N days ago" for rarely-hit muscles.
const LOOKBACK_DAYS = 30;

export default function MuscleFatigueTab({ idUser }: { idUser?: number }) {
  const { data: res, isLoading } = useQuery({
    queryKey: ["muscle-set-history", "fatigue", idUser],
    queryFn: () => getMuscleGroupSetHistory({ IdUser: idUser, days: LOOKBACK_DAYS }),
    staleTime: 60_000,
  });
  const rowsData = res?.data?.data;
  const rows: IMuscleSetHistoryRow[] = Array.isArray(rowsData) ? rowsData : [];
  const results = computeFatigue(rows);

  const trained = results.filter(r => r.DaysSinceLastTrained != null).sort((a, b) => b.FatiguePct - a.FatiguePct);
  const untrained = results.filter(r => r.DaysSinceLastTrained == null);

  const frontPctMap = muscleGroupPctBySlug(results.map(r => ({ MuscleGroup: r.MuscleGroup, pct: r.FatiguePct })), "front");
  const backPctMap = muscleGroupPctBySlug(results.map(r => ({ MuscleGroup: r.MuscleGroup, pct: r.FatiguePct })), "back");
  const colorFor = (map: Map<string, number>) => (slug: string) => map.has(slug) ? "" : "fill-gray-300 dark:fill-gray-700";
  const styleFor = (map: Map<string, number>) => (slug: string) => map.has(slug) ? { fill: fatigueColor(map.get(slug)!) } : {};

  return (
    <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
      <CardHeader className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Est. Fatigue · by recent training load</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          A rough estimate from sets in the last 3 days, not a measurement — always based on "right now," not the range above.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            <div className="flex items-start justify-center gap-6 mb-4">
              <div className="w-36 sm:w-48">
                <BodySvg paths={FRONT_PATHS} viewBox={FRONT_VIEWBOX} colorFor={colorFor(frontPctMap)} styleFor={styleFor(frontPctMap)} />
              </div>
              <div className="w-36 sm:w-48">
                <BodySvg paths={BACK_PATHS} viewBox={BACK_VIEWBOX} colorFor={colorFor(backPctMap)} styleFor={styleFor(backPctMap)} />
              </div>
            </div>

            <div className="space-y-3">
              {trained.map(r => (
                <div key={r.MuscleGroup}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.MuscleGroup}</span>
                    <span className="text-[10px] font-semibold" style={{ color: fatigueColor(r.FatiguePct) }}>
                      Est. Fatigue: {r.FatiguePct}% · {r.DaysSinceLastTrained === 0 ? "today" : `${r.DaysSinceLastTrained}d ago`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${r.FatiguePct}%`, backgroundColor: fatigueColor(r.FatiguePct) }} />
                  </div>
                </div>
              ))}
              {trained.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No sets logged in the last {LOOKBACK_DAYS} days.</p>
              )}
            </div>

            {untrained.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">Not trained recently</p>
                <div className="flex flex-wrap gap-1.5">
                  {untrained.map(r => (
                    <span key={r.MuscleGroup} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {r.MuscleGroup}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-800 pt-3">
              <span>Fresh</span>
              <span className="flex-1 h-1.5 rounded-full" style={{ background: `linear-gradient(to right, ${fatigueColor(0)}, ${fatigueColor(50)}, ${fatigueColor(100)})` }} />
              <span>Fatigued</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
