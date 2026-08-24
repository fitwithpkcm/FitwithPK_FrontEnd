import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Check, Play } from "lucide-react";
import moment from "moment";
import { IExercise, ISetLog } from "../../interface/IWorkout";
import { getSetLogsForExercise } from "../../services/WorkoutService";
import { groupSetsBySession, suggestNextLoad } from "../../lib/workout/progression";
import { getYoutubeThumbnail } from "../../lib/workout/video";

interface GuidedExercisePanelProps {
  exercise: IExercise;
  todaySetLogs: ISetLog[];
  selectedDate: string;
  saving: boolean;
  onCommitSet: (setNumber: number, reps: number, weight: number | undefined, unit: string, existing: ISetLog | null) => void;
  onDeleteSet: (setLog: ISetLog) => void;
  onOpenVideo: () => void;
}

// WeightUsed/RepsCompleted come back from the API as strings (MySQL columns
// via mysql2) — coerce to Number before formatting so "75.00" reads as "75".
function formatSessionSets(session: { sets: ISetLog[] }, isBodyweight: boolean): string {
  return session.sets
    .map(s => (isBodyweight || s.WeightUsed == null ? `${Number(s.RepsCompleted)}` : `${Number(s.WeightUsed)}×${Number(s.RepsCompleted)}`))
    .join(", ");
}

export default function GuidedExercisePanel({
  exercise, todaySetLogs, selectedDate, saving, onCommitSet, onDeleteSet, onOpenVideo,
}: GuidedExercisePanelProps) {
  const isBodyweight = (exercise.WeightUnit ?? "kg") === "bodyweight";
  const unit = exercise.WeightUnit ?? "kg";
  const [extraRows, setExtraRows] = useState(0);
  const [pending, setPending] = useState<Record<number, { reps: number; weight: number }>>({});

  // Reset local draft state whenever the exercise changes (Prev/Next navigation).
  useEffect(() => { setExtraRows(0); setPending({}); }, [exercise.IdExercise]);

  const { data: historyRes } = useQuery({
    queryKey: ["set-logs-for-exercise", exercise.ExerciseName],
    queryFn: () => getSetLogsForExercise({ ExerciseName: exercise.ExerciseName }),
    enabled: !!exercise.ExerciseName,
    staleTime: 60_000,
  });
  const fullHistory: ISetLog[] = Array.isArray(historyRes?.data?.data) ? historyRes.data.data : [];
  const priorHistory = fullHistory.filter(l => l.LogDate !== selectedDate);
  const sessions = groupSetsBySession(priorHistory, exercise);
  const lastSession = sessions[0];
  const suggestion = suggestNextLoad(exercise, priorHistory);

  const rowCount = Math.max(exercise.Sets, todaySetLogs.length) + extraRows;
  const thumb = exercise.VideoUrl ? getYoutubeThumbnail(exercise.VideoUrl) : null;

  // exercise.TargetWeight may come back as a string (MySQL DECIMAL via
  // mysql2) — coerce so later +/- steppers stay real arithmetic.
  const targetWeight = exercise.TargetWeight != null ? Number(exercise.TargetWeight) : 0;
  const getPending = (setNumber: number) => {
    if (pending[setNumber]) return pending[setNumber];
    if (setNumber === 1 && suggestion) {
      return { reps: suggestion.RepsCompleted, weight: suggestion.WeightUsed ?? targetWeight };
    }
    return { reps: exercise.TargetReps, weight: targetWeight };
  };
  const setPendingField = (setNumber: number, field: "reps" | "weight", value: number) => {
    setPending(p => ({ ...p, [setNumber]: { ...getPending(setNumber), [field]: Math.max(field === "reps" ? 1 : 0, value) } }));
  };

  const handleToggle = (setNumber: number, existing: ISetLog | undefined) => {
    if (existing) { onDeleteSet(existing); return; }
    const vals = getPending(setNumber);
    onCommitSet(setNumber, vals.reps, isBodyweight ? undefined : vals.weight, unit, null);
  };

  const handleRemoveSet = () => {
    const lastNum = rowCount;
    const lastExisting = todaySetLogs.find(s => s.SetNumber === lastNum);
    if (lastExisting) onDeleteSet(lastExisting);
    else setExtraRows(n => Math.max(0, n - 1));
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
      {thumb && (
        <button onClick={onOpenVideo} className="relative w-full rounded-xl overflow-hidden aspect-video bg-black">
          <img src={thumb} alt={exercise.ExerciseName} className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-5 w-5 text-gray-900 ml-0.5" fill="currentColor" />
            </div>
          </div>
        </button>
      )}

      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{exercise.ExerciseName}</h2>
        {exercise.MuscleGroup && (
          <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {exercise.MuscleGroup}
          </span>
        )}
      </div>

      {lastSession && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Last time ({moment(lastSession.logDate, "DD-MM-YYYY").format("D MMM")}): {formatSessionSets(lastSession, isBodyweight)}
        </p>
      )}
      {suggestion && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{suggestion.Why}</p>
      )}

      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className={`grid ${isBodyweight ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_1fr_1fr_auto]"} gap-2 px-3 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide`}>
          <span></span>
          {!isBodyweight && <span className="text-center">Weight ({unit})</span>}
          <span className="text-center">Reps</span>
          <span></span>
        </div>
        {Array.from({ length: rowCount }, (_, i) => i + 1).map(setNumber => {
          const existing = todaySetLogs.find(s => s.SetNumber === setNumber);
          const vals = existing
            ? { reps: Number(existing.RepsCompleted), weight: existing.WeightUsed != null ? Number(existing.WeightUsed) : 0 }
            : getPending(setNumber);
          const done = !!existing;
          return (
            <div key={setNumber} className={`grid ${isBodyweight ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_1fr_1fr_auto]"} gap-2 items-center px-3 py-2 border-t border-gray-100 dark:border-gray-700`}>
              <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-bold text-gray-500 dark:text-gray-300 flex items-center justify-center">
                {setNumber}
              </span>
              {!isBodyweight && (
                <div className="flex items-center justify-center gap-1.5">
                  <button disabled={done} onClick={() => setPendingField(setNumber, "weight", vals.weight - 2.5)}
                    className="w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-500 flex items-center justify-center disabled:opacity-30">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums">{vals.weight}</span>
                  <button disabled={done} onClick={() => setPendingField(setNumber, "weight", vals.weight + 2.5)}
                    className="w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-500 flex items-center justify-center disabled:opacity-30">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-center gap-1.5">
                <button disabled={done} onClick={() => setPendingField(setNumber, "reps", vals.reps - 1)}
                  className="w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-500 flex items-center justify-center disabled:opacity-30">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums">{vals.reps}</span>
                <button disabled={done} onClick={() => setPendingField(setNumber, "reps", vals.reps + 1)}
                  className="w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-500 flex items-center justify-center disabled:opacity-30">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <button disabled={saving} onClick={() => handleToggle(setNumber, existing)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  done ? "bg-emerald-500" : "border-2 border-gray-300 dark:border-gray-600"
                }`}>
                {done && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
              </button>
            </div>
          );
        })}
        <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-100 dark:border-gray-700 text-xs font-semibold">
          <button onClick={handleRemoveSet} className="text-gray-400 hover:text-red-500 transition-colors">− Remove set</button>
          <button onClick={() => setExtraRows(n => n + 1)} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors">+ Add set</button>
        </div>
      </div>
    </div>
  );
}
