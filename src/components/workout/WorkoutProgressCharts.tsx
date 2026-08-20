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

// ── colour palette for workout lines ────────────────────────────────
const LINE_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#ec4899","#14b8a6","#f97316","#84cc16","#06b6d4",
];

// ── muscle group progress bar colour by how close to target ──────────
const muscleColor = (sets: number, target: number) => {
  const pct = sets / target;
  if (pct >= 1)   return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" };
  if (pct >= 0.5) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" };
  return { bar: "bg-red-400", text: "text-red-500 dark:text-red-400", chip: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" };
};

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
  const [weeks, setWeeks] = useState(8);

  // ── volume history ──────────────────────────────────────────────
  const { data: volRes, isLoading: volLoading } = useQuery({
    queryKey: ["volume-history", idUser, weeks],
    queryFn: () => getVolumeHistory({ IdUser: idUser, weeks }),
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

  const totalVolume = volumeRaw.reduce((sum, d) => sum + (d.Volume ?? 0), 0);
  const sessionsLogged = allDates.length;

  // ── muscle group volume ─────────────────────────────────────────
  const { data: muscleRes, isLoading: muscleLoading } = useQuery({
    queryKey: ["muscle-volume", idUser, weeks],
    queryFn: () => getMuscleGroupVolume({ IdUser: idUser, weeks }),
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

  // build muscle progress data — all muscle groups, fill 0 if not trained,
  // sorted so the ones needing the most attention surface first
  const muscleChartData = MUSCLE_GROUPS.map(mg => {
    const found = muscleRaw.find(m => m.MuscleGroup === mg);
    const targetRow = targets.find(t => t.MuscleGroup === mg);
    const target = targetRow?.WeeklySetTarget ?? 12;
    return {
      MuscleGroup: mg,
      WeeklySets: found?.WeeklySets ?? 0,
      WeeklyVolume: found?.WeeklyVolume ?? 0,
      target,
    };
  }).sort((a, b) => (a.WeeklySets / a.target) - (b.WeeklySets / b.target));

  const onTargetCount = muscleChartData.filter(m => m.WeeklySets >= m.target).length;
  const weeksLabel = weeks === 1 ? "this week" : `the last ${weeks} weeks`;

  return (
    <div className="space-y-5 px-4 py-4 pb-6">

      {/* ── time range selector ──────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">Show:</span>
        {[1, 4, 8, 12].map(w => (
          <button
            key={w}
            onClick={() => setWeeks(w)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              weeks === w
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400"
            }`}
          >
            {w === 1 ? "1 wk" : `${w} wks`}
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
            <p className="text-lg font-extrabold text-gray-900 dark:text-white leading-none">{onTargetCount}<span className="text-xs font-normal text-gray-400">/{muscleChartData.length}</span></p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">Muscles on target</p>
          </CardContent>
        </Card>
      </div>

      {/* ── workout volume line chart ────────────────────────────── */}
      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardHeader className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">How much you're lifting</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Total weight moved per session, over {weeksLabel}</p>
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

      {/* ── muscle group progress list ───────────────────────────── */}
      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardHeader className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Muscle group balance</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Sets per muscle group vs. your weekly target — {weeksLabel}
            {isAdmin && <span> · tap ✏ to adjust a target</span>}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {muscleLoading ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
          ) : (
            <div className="space-y-3">
              {muscleChartData.map(m => {
                const pct = Math.min(100, Math.round((m.WeeklySets / m.target) * 100));
                const colors = muscleColor(m.WeeklySets, m.target);
                return (
                  <div key={m.MuscleGroup}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{m.MuscleGroup}</span>
                      <span className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold ${colors.text}`}>{m.WeeklySets}/{m.target} sets</span>
                        {isAdmin && idUser && (
                          <TargetEditor
                            target={{ IdCoach: 0, IdUser: idUser, MuscleGroup: m.MuscleGroup, WeeklySetTarget: m.target, IdTarget: targets.find(t => t.MuscleGroup === m.MuscleGroup)?.IdTarget }}
                            onSave={t => targetMut.mutate(t)}
                          />
                        )}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* legend */}
          <div className="mt-4 flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-800 pt-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Needs work</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>Halfway there</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>On target</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
