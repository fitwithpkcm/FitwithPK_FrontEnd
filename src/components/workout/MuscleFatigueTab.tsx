import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "../ui/card";
import { getMuscleGroupSetHistory } from "../../services/WorkoutService";
import { IMuscleSetHistoryRow } from "../../interface/IWorkout";
import { FRONT_PATHS, BACK_PATHS, FRONT_VIEWBOX, BACK_VIEWBOX, muscleGroupPctBySlug, slugToMuscleGroup } from "../../lib/muscle-diagram/paths";
import { fatigueColor } from "../../lib/muscle-diagram/colorScale";
import { computeFatigue } from "../../lib/workout/muscleAnalytics";
import BodySvg from "./BodySvg";

// Fixed lookback, independent of the page's Week/30d/90d/All range — fatigue
// is about "right now," not a chosen history window. 30 days is generous
// enough to still caption "last trained N days ago" for rarely-hit muscles.
const LOOKBACK_DAYS = 30;

export default function MuscleFatigueTab({ idUser }: { idUser?: number }) {
  const [focusedMuscle, setFocusedMuscle] = useState<string | null>(null);
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

  // Only muscles trained recently enough to have a fatigue reading get a
  // color — "never trained recently" is "no data," not "0% fatigued."
  const frontPctMap = muscleGroupPctBySlug(trained.map(r => ({ MuscleGroup: r.MuscleGroup, pct: r.FatiguePct })), "front");
  const backPctMap = muscleGroupPctBySlug(trained.map(r => ({ MuscleGroup: r.MuscleGroup, pct: r.FatiguePct })), "back");
  const colorFor = (map: Map<string, number>) => (slug: string) => map.has(slug) ? "" : "fill-gray-300 dark:fill-gray-700";
  const styleFor = (map: Map<string, number>) => (slug: string): React.CSSProperties => {
    const base: React.CSSProperties = map.has(slug) ? { fill: fatigueColor(map.get(slug)!) } : {};
    if (!focusedMuscle) return base;
    const isFocused = slugToMuscleGroup(slug) === focusedMuscle;
    return {
      ...base,
      opacity: isFocused ? 1 : 0.3,
      transform: isFocused ? "scale(1.08)" : undefined,
      transformOrigin: "center",
      transformBox: "fill-box",
      transition: "opacity 0.2s ease, transform 0.2s ease",
    };
  };
  const handleSlugClick = (slug: string) => {
    const mg = slugToMuscleGroup(slug);
    if (!mg) return;
    setFocusedMuscle(prev => prev === mg ? null : mg);
  };
  const focusedResult = focusedMuscle ? results.find(r => r.MuscleGroup === focusedMuscle) : null;

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
            <div className="flex items-start justify-center gap-3 -mx-4 mb-2">
              <div className="flex-1 max-w-[200px] sm:max-w-[240px]">
                <BodySvg paths={FRONT_PATHS} viewBox={FRONT_VIEWBOX} colorFor={colorFor(frontPctMap)} styleFor={styleFor(frontPctMap)} onSlugClick={handleSlugClick} />
              </div>
              <div className="flex-1 max-w-[200px] sm:max-w-[240px]">
                <BodySvg paths={BACK_PATHS} viewBox={BACK_VIEWBOX} colorFor={colorFor(backPctMap)} styleFor={styleFor(backPctMap)} onSlugClick={handleSlugClick} />
              </div>
            </div>

            <div className="h-5 flex items-center justify-center gap-2 mb-2">
              {focusedMuscle && focusedResult ? (
                <>
                  <span className="text-xs font-bold text-gray-800 dark:text-white">{focusedMuscle}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {focusedResult.DaysSinceLastTrained != null
                      ? `Est. Fatigue: ${focusedResult.FatiguePct}% · ${focusedResult.DaysSinceLastTrained === 0 ? "today" : `${focusedResult.DaysSinceLastTrained}d ago`}`
                      : "Not trained recently"}
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-gray-300 dark:text-gray-600">Tap a muscle for details</span>
              )}
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
