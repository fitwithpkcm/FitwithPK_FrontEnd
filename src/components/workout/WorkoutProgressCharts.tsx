import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import moment from "moment";
import { Pencil, Check, X } from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
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

// ── muscle group bar colours ─────────────────────────────────────────
const muscleColor = (sets: number, target: number) => {
  const pct = sets / target;
  if (pct >= 1)   return "#10b981"; // green — at or above target
  if (pct >= 0.5) return "#f59e0b"; // amber — halfway
  return "#ef4444";                  // red — undertrained
};

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
          {p.name}: <span className="font-bold">{Math.round(p.value).toLocaleString()} kg·reps</span>
        </p>
      ))}
    </div>
  );
}

// ── custom tooltip for muscle bar chart ─────────────────────────────
function MuscleTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as IMuscleVolumePoint & { target: number };
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      <p>Sets: <span className="font-bold">{d?.WeeklySets}</span> / {d?.target}</p>
      <p>Volume: <span className="font-bold">{Math.round(d?.WeeklyVolume ?? 0).toLocaleString()} kg·reps</span></p>
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
    <button onClick={() => setEditing(true)} className="text-blue-500 hover:text-blue-700">
      <Pencil className="h-3 w-3" />
    </button>
  );
  return (
    <span className="flex items-center gap-1">
      <input
        type="number" min={1} max={40} value={val}
        onChange={e => setVal(e.target.value)}
        className="w-12 text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800"
      />
      <button onClick={() => { onSave({ ...target, WeeklySetTarget: Number(val) }); setEditing(false); }}>
        <Check className="h-3 w-3 text-green-500" />
      </button>
      <button onClick={() => setEditing(false)}><X className="h-3 w-3 text-gray-400" /></button>
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

  // build bar chart data — all muscle groups, fill 0 if not trained
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
  });

  const weeksLabel = weeks === 1 ? "This week" : `Last ${weeks} weeks`;

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

      {/* ── workout volume line chart ────────────────────────────── */}
      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Workout Volume</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">sets × reps × weight — {weeksLabel}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {volLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
          ) : volumeChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No workouts logged yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={volumeChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
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

      {/* ── muscle group bar chart ───────────────────────────────── */}
      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Muscle Group Volume</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Sets per muscle group — {weeksLabel}</p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Under</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>50%+</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Target</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {muscleLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={muscleChartData} margin={{ top: 5, right: 10, left: -10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="MuscleGroup" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<MuscleTooltip />} />
                <Bar dataKey="WeeklySets" name="Sets" radius={[4,4,0,0]}>
                  {muscleChartData.map((entry, i) => (
                    <Cell key={i} fill={muscleColor(entry.WeeklySets, entry.target)} />
                  ))}
                </Bar>
                <ReferenceLine y={12} stroke="#6b7280" strokeDasharray="4 2" label={{ value: "Target", position: "insideTopRight", fontSize: 9, fill: "#6b7280" }} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* per-muscle target table — admin can edit, client sees read-only */}
          <div className="mt-4 space-y-1 px-2">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              Weekly set targets {isAdmin && <span className="normal-case font-normal">(tap ✏ to adjust)</span>}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {muscleChartData.map(m => (
                <div key={m.MuscleGroup} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-300">{m.MuscleGroup}</span>
                  <span className="flex items-center gap-1.5">
                    <Badge className={`text-[10px] h-4 border-0 px-1.5 ${
                      m.WeeklySets >= m.target
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : m.WeeklySets >= m.target * 0.5
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    }`}>
                      {m.WeeklySets}/{m.target}
                    </Badge>
                    {isAdmin && idUser && (
                      <TargetEditor
                        target={{ IdCoach: 0, IdUser: idUser, MuscleGroup: m.MuscleGroup, WeeklySetTarget: m.target, IdTarget: targets.find(t => t.MuscleGroup === m.MuscleGroup)?.IdTarget }}
                        onSave={t => targetMut.mutate(t)}
                      />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
