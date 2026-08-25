import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import moment from "moment";
import { Pencil, Check, X, Dumbbell, TrendingUp, Target as TargetIcon } from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardContent, CardHeader } from "../ui/card";
import { queryClient } from "../../lib/queryClient";
import {
  getVolumeHistory, getMuscleGroupVolume, getMuscleTargets, upsertMuscleTarget,
} from "../../services/WorkoutService";
import {
  IVolumeDataPoint, IMuscleVolumePoint, IMuscleTarget, MUSCLE_GROUPS,
} from "../../interface/IWorkout";
import {
  FRONT_PATHS, BACK_PATHS, FRONT_VIEWBOX, BACK_VIEWBOX, muscleGroupPctBySlug, slugToMuscleGroup,
} from "../../lib/muscle-diagram/paths";
import { targetColor, targetDiagramColor } from "../../lib/muscle-diagram/colorScale";
import BodySvg from "./BodySvg";
import MuscleFatigueTab from "./MuscleFatigueTab";
import MuscleStrengthTab from "./MuscleStrengthTab";

// ── time range shared across all three sub-tabs ────────────────────
const RANGES = ["week", "30d", "90d", "all"] as const;
type Range = typeof RANGES[number];
const RANGE_LABEL: Record<Range, string> = { week: "Week", "30d": "30d", "90d": "90d", all: "All" };
const RANGE_PERIOD_TEXT: Record<Range, string> = { week: "this week", "30d": "the last 30 days", "90d": "the last 90 days", all: "all time" };
const RANGE_TO_DAYS: Record<Range, number | null> = { week: 7, "30d": 30, "90d": 90, all: null };
// getVolumeHistory's backend still takes `weeks`, not `days` — this redesign
// didn't touch that endpoint, so approximate the new ranges in weeks instead.
const RANGE_TO_VOLUME_WEEKS: Record<Range, number> = { week: 1, "30d": 5, "90d": 13, all: 104 };

// ── colour palette for workout lines ────────────────────────────────
const LINE_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#ec4899","#14b8a6","#f97316","#84cc16","#06b6d4",
];

function formatVolume(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return Math.round(v).toLocaleString();
}

// ── custom tooltip for volume line chart ─────────────────────────────
function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
        {label ? moment(label, "DD-MM-YYYY").format("D MMM") : ""}
      </p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{formatVolume(p.value)} kg lifted</span>
        </p>
      ))}
    </div>
  );
}

// ── TargetEditor (admin only) ─────────────────────────────────────────
function TargetEditor({ target, onSave }: {
  target: IMuscleTarget; onSave: (t: IMuscleTarget) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(target.WeeklySetTarget.toString());
  if (!editing) return (
    <button onClick={() => setEditing(true)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-blue-500 transition-colors flex-shrink-0">
      <Pencil className="h-3 w-3" />
    </button>
  );
  return (
    <span className="flex items-center gap-1 flex-shrink-0">
      <input
        type="number" min={1} max={40} value={val}
        onChange={e => setVal(e.target.value)}
        className="w-12 text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800"
      />
      <button onClick={() => { onSave({ ...target, WeeklySetTarget: Number(val) }); setEditing(false); }}>
        <Check className="h-3.5 w-3.5 text-green-500" />
      </button>
      <button onClick={() => setEditing(false)}><X className="h-3.5 w-3.5 text-gray-400" /></button>
    </span>
  );
}

// ── main component ───────────────────────────────────────────────────

interface Props {
  /** client's IdUser — pass for admin view; omit for client (uses own ID) */
  idUser?: number;
  isAdmin?: boolean;
}

export default function WorkoutProgressCharts({ idUser, isAdmin }: Props) {
  const [range, setRange] = useState<Range>("week");
  const [subTab, setSubTab] = useState<"balance" | "fatigue" | "strength">("balance");
  const [focusedMuscle, setFocusedMuscle] = useState<string | null>(null);
  const rangeDays = RANGE_TO_DAYS[range];
  const periodLabel = RANGE_PERIOD_TEXT[range];

  // ── volume history ──────────────────────────────────────────────
  const { data: volRes, isLoading: volLoading } = useQuery({
    queryKey: ["volume-history", idUser, range],
    queryFn: () => getVolumeHistory({ IdUser: idUser, weeks: RANGE_TO_VOLUME_WEEKS[range] }),
    staleTime: 60_000,
  });
  const volumeRawData = (volRes as any)?.data?.data;
  const volumeRaw: IVolumeDataPoint[] = Array.isArray(volumeRawData) ? volumeRawData : [];

  // pivot: { date -> { WorkoutName: volume } }
  const workoutNames = [...new Set(volumeRaw.map(d => d.WorkoutName))];
  const allDates     = [...new Set(volumeRaw.map(d => d.LogDate))].sort(
    (a, b) => moment(a,"DD-MM-YYYY").valueOf() - moment(b,"DD-MM-YYYY").valueOf()
  );
  const volumeChartData = allDates.map(date => {
    const row: any = { date, label: moment(date,"DD-MM-YYYY").format("D MMM") };
    workoutNames.forEach(name => {
      const point = volumeRaw.find(d => d.LogDate === date && d.WorkoutName === name);
      row[name] = point ? Math.round(point.Volume) : undefined;
    });
    return row;
  });

  // d.Volume is a SUM(...) result — mysql2 returns it as a string (same
  // DECIMAL-as-string gotcha as WeightUsed/TargetWeight elsewhere), so this
  // must be coerced or "sum + string" silently string-concatenates into NaN.
  const totalVolume = volumeRaw.reduce((sum, d) => sum + Number(d.Volume ?? 0), 0);
  const sessionsLogged = allDates.length;

  // ── muscle group volume ─────────────────────────────────────────
  const { data: muscleRes, isLoading: muscleLoading } = useQuery({
    queryKey: ["muscle-volume", idUser, range],
    queryFn: () => getMuscleGroupVolume({ IdUser: idUser, days: rangeDays }),
    staleTime: 60_000,
  });
  const muscleRawData = (muscleRes as any)?.data?.data;
  const muscleRaw: IMuscleVolumePoint[] = Array.isArray(muscleRawData) ? muscleRawData : [];

  // ── muscle targets ──────────────────────────────────────────────
  const { data: targetsRes } = useQuery({
    queryKey: ["muscle-targets", idUser],
    queryFn: () => getMuscleTargets({ IdUser: idUser! }),
    enabled: !!idUser,
    staleTime: 60_000,
  });
  const targetsData = (targetsRes as any)?.data?.data;
  const targets: IMuscleTarget[] = Array.isArray(targetsData) ? targetsData : [];

  const targetMut = useMutation({
    mutationFn: upsertMuscleTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["muscle-targets", idUser] });
      toast.success("Target updated");
    },
    onError: () => toast.error("Failed to update target"),
  });

  // Weekly target scaled to the selected window (12/week -> ~51 over 30d) so
  // the color-coding stays meaningful at every range. "All" has no sensible
  // scaled target, so it falls back to plain relative-volume ranking below.
  const balanceData = MUSCLE_GROUPS.map(mg => {
    const found = muscleRaw.find(m => m.MuscleGroup === mg);
    const targetRow = targets.find(t => t.MuscleGroup === mg);
    const weeklyTarget = targetRow?.WeeklySetTarget ?? 12;
    const scaledTarget = rangeDays ? Math.max(1, Math.round(weeklyTarget * (rangeDays / 7))) : null;
    return {
      MuscleGroup: mg,
      Sets: found?.WeeklySets ?? 0,
      weeklyTarget,
      scaledTarget,
      IdTarget: targetRow?.IdTarget,
    };
  });
  const maxSets = Math.max(1, ...balanceData.map(m => m.Sets));
  const balanceWithPct = balanceData.map(m => ({
    ...m,
    pct: m.scaledTarget != null
      ? Math.min(100, Math.round((m.Sets / m.scaledTarget) * 100))
      : Math.round((m.Sets / maxSets) * 100),
  }));
  const trainedMuscles = balanceWithPct.filter(m => m.Sets > 0);
  const untrainedMuscles = balanceWithPct.filter(m => m.Sets === 0);
  const sortedTrained = [...trainedMuscles].sort((a, b) =>
    rangeDays != null ? a.pct - b.pct : b.Sets - a.Sets
  );
  const onTargetCount = rangeDays != null
    ? balanceWithPct.filter(m => m.scaledTarget != null && m.Sets >= m.scaledTarget).length
    : trainedMuscles.length;

  // Only muscles actually trained this period get a color — an untrained
  // muscle (0 sets) is "no data," not "0% progress," so it stays the plain
  // gray fallback on the diagram, matching its "Not trained" chip below.
  const frontPctMap = muscleGroupPctBySlug(trainedMuscles.map(m => ({ MuscleGroup: m.MuscleGroup, pct: m.pct })), "front");
  const backPctMap = muscleGroupPctBySlug(trainedMuscles.map(m => ({ MuscleGroup: m.MuscleGroup, pct: m.pct })), "back");
  const colorFor = (map: Map<string, number>) => (slug: string) => map.has(slug) ? "" : "fill-gray-300 dark:fill-gray-700";
  const styleFor = (map: Map<string, number>) => (slug: string): React.CSSProperties => {
    const base: React.CSSProperties = map.has(slug) ? { fill: targetDiagramColor(map.get(slug)!) } : {};
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
  const focusedData = focusedMuscle ? balanceWithPct.find(m => m.MuscleGroup === focusedMuscle) : null;

  return (
    <div className="space-y-5 px-4 py-4 pb-6">

      {/* ── time range selector ──────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">Show:</span>
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              range === r
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400"
            }`}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      {/* ── friendly summary strip ───────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5">
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
          <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-extrabold text-gray-900 dark:text-white leading-none">{sessionsLogged}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">Sessions logged</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
          <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-lg font-extrabold text-gray-900 dark:text-white leading-none">{formatVolume(totalVolume)}<span className="text-xs font-normal text-gray-400"> kg</span></p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">Total lifted</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
          <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <TargetIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-extrabold text-gray-900 dark:text-white leading-none">{onTargetCount}<span className="text-xs font-normal text-gray-400">/{balanceWithPct.length}</span></p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{rangeDays != null ? "Muscles on target" : "Muscles trained"}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── muscle balance / fatigue / strength sub-tabs ─────────── */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {([
          ["balance", "Muscle balance"],
          ["fatigue", "Fatigue"],
          ["strength", "Strength"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
              subTab === key
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "balance" && (
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
          <CardHeader className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Muscle balance · by sets worked</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {rangeDays != null ? `Progress toward your weekly target, over ${periodLabel}` : `Relative volume, ${periodLabel}`}
              {isAdmin && <span> · tap ✏ to adjust a target</span>}
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {muscleLoading ? (
              <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <>
                <div className="flex items-start justify-center gap-6 mb-2">
                  <div className="w-36 sm:w-48">
                    <BodySvg paths={FRONT_PATHS} viewBox={FRONT_VIEWBOX} colorFor={colorFor(frontPctMap)} styleFor={styleFor(frontPctMap)} onSlugClick={handleSlugClick} />
                  </div>
                  <div className="w-36 sm:w-48">
                    <BodySvg paths={BACK_PATHS} viewBox={BACK_VIEWBOX} colorFor={colorFor(backPctMap)} styleFor={styleFor(backPctMap)} onSlugClick={handleSlugClick} />
                  </div>
                </div>

                <div className="h-5 flex items-center justify-center gap-2 mb-2">
                  {focusedMuscle && focusedData ? (
                    <>
                      <span className="text-xs font-bold text-gray-800 dark:text-white">{focusedMuscle}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {focusedData.Sets > 0
                          ? (focusedData.scaledTarget != null ? `${focusedData.Sets}/${focusedData.scaledTarget} sets` : `${focusedData.Sets} sets`)
                          : "Not trained in this period"}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">Tap a muscle for details</span>
                  )}
                </div>

                <div className="space-y-3">
                  {sortedTrained.map(m => (
                    <div key={m.MuscleGroup}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{m.MuscleGroup}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold" style={{ color: targetColor(m.pct) }}>
                            {m.scaledTarget != null ? `${m.Sets}/${m.scaledTarget} sets` : `${m.Sets} sets`}
                          </span>
                          {isAdmin && idUser && (
                            <TargetEditor
                              target={{ IdCoach: 0, IdUser: idUser, MuscleGroup: m.MuscleGroup, WeeklySetTarget: m.weeklyTarget, IdTarget: m.IdTarget }}
                              onSave={t => targetMut.mutate(t)}
                            />
                          )}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${m.pct}%`, backgroundColor: targetColor(m.pct) }}
                        />
                      </div>
                    </div>
                  ))}
                  {trainedMuscles.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Nothing logged {periodLabel} yet.</p>
                  )}
                </div>

                {untrainedMuscles.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">Not trained in this period</p>
                    <div className="flex flex-wrap gap-1.5">
                      {untrainedMuscles.map(m => (
                        <span key={m.MuscleGroup} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          {m.MuscleGroup}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* gradient legend */}
                <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-800 pt-3">
                  <span>Less</span>
                  <span className="flex-1 h-1.5 rounded-full" style={{ background: `linear-gradient(to right, ${targetDiagramColor(0)}, ${targetDiagramColor(50)}, ${targetDiagramColor(100)})` }} />
                  <span>More</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {subTab === "fatigue" && <MuscleFatigueTab idUser={idUser} />}
      {subTab === "strength" && <MuscleStrengthTab idUser={idUser} rangeDays={rangeDays} rangeLabel={RANGE_LABEL[range]} />}

      {/* ── workout volume line chart ────────────────────────────── */}
      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardHeader className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">How much you're lifting</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Total weight moved per session, over {periodLabel}</p>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {volLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
          ) : volumeChartData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center gap-2 px-6">
              <Dumbbell className="h-8 w-8 text-gray-200 dark:text-gray-700" />
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No workouts logged yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">Log a workout and your progress will show up here.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={volumeChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatVolume(v)} />
                <Tooltip content={<VolumeTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {workoutNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    name={name}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
