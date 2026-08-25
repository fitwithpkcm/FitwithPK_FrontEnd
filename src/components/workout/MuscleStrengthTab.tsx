import React from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { getMuscleGroupSetHistory } from "../../services/WorkoutService";
import { IMuscleSetHistoryRow } from "../../interface/IWorkout";
import { FRONT_PATHS, BACK_PATHS, FRONT_VIEWBOX, BACK_VIEWBOX, muscleGroupPctBySlug } from "../../lib/muscle-diagram/paths";
import { strengthColor } from "../../lib/muscle-diagram/colorScale";
import { computeStrength } from "../../lib/workout/muscleAnalytics";
import BodySvg from "./BodySvg";

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
  const results = computeStrength(rows, rangeDays);

  const ranked = results.filter(r => r.Best1RM != null).sort((a, b) => b.Best1RM! - a.Best1RM!);
  const bodyweightOnly = results.filter(r => r.HasSets && r.Best1RM == null);
  const untrained = results.filter(r => !r.HasSets);
  const strongest = ranked.length > 0 ? ranked[0].Best1RM! : 1;

  const frontPctMap = muscleGroupPctBySlug(ranked.map(r => ({ MuscleGroup: r.MuscleGroup, pct: Math.round((r.Best1RM! / strongest) * 100) })), "front");
  const backPctMap = muscleGroupPctBySlug(ranked.map(r => ({ MuscleGroup: r.MuscleGroup, pct: Math.round((r.Best1RM! / strongest) * 100) })), "back");
  const colorFor = (map: Map<string, number>) => (slug: string) => map.has(slug) ? "" : "fill-gray-300 dark:fill-gray-700";
  const styleFor = (map: Map<string, number>) => (slug: string) => map.has(slug) ? { fill: strengthColor(map.get(slug)!) } : {};

  return (
    <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
      <CardHeader className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Est. Strength · by estimated 1-rep max</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Estimated from your heaviest logged sets over {rangeLabel === "All" ? "all time" : rangeLabel.toLowerCase()}, not an actual max test.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            <div className="flex items-start justify-center gap-4 mb-4">
              <div className="w-24 sm:w-32">
                <BodySvg paths={FRONT_PATHS} viewBox={FRONT_VIEWBOX} colorFor={colorFor(frontPctMap)} styleFor={styleFor(frontPctMap)} />
              </div>
              <div className="w-24 sm:w-32">
                <BodySvg paths={BACK_PATHS} viewBox={BACK_VIEWBOX} colorFor={colorFor(backPctMap)} styleFor={styleFor(backPctMap)} />
              </div>
            </div>

            <div className="space-y-3">
              {ranked.map(r => {
                const pct = Math.round((r.Best1RM! / strongest) * 100);
                return (
                  <div key={r.MuscleGroup}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.MuscleGroup}</span>
                      <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: strengthColor(pct) }}>
                        Est. 1RM: {Math.round(r.Best1RM!)}kg
                        {r.DeltaPct != null && (
                          <span className={`flex items-center gap-0.5 ${r.DeltaPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                            {r.DeltaPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(r.DeltaPct)}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: strengthColor(pct) }} />
                    </div>
                  </div>
                );
              })}
              {ranked.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No weighted sets logged {rangeLabel === "All" ? "yet" : `over ${rangeLabel.toLowerCase()}`}.</p>
              )}
            </div>

            {bodyweightOnly.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">Bodyweight only — no estimate</p>
                <div className="flex flex-wrap gap-1.5">
                  {bodyweightOnly.map(r => (
                    <span key={r.MuscleGroup} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {r.MuscleGroup}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {untrained.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">Not trained in this period</p>
                <div className="flex flex-wrap gap-1.5">
                  {untrained.map(r => (
                    <span key={r.MuscleGroup} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {r.MuscleGroup}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
