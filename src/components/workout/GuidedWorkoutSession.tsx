import React, { useEffect, useState } from "react";
import { X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { IWorkout, IExercise, ISetLog } from "../../interface/IWorkout";
import GuidedExercisePanel from "./GuidedExercisePanel";
import VideoSheet from "./VideoSheet";

interface GuidedWorkoutSessionProps {
  workout: IWorkout;
  allSetLogs: ISetLog[]; // today's logs across all of this workout's exercises
  selectedDate: string;
  saving: boolean;
  onClose: () => void;
  onCommitSet: (ex: IExercise, setNumber: number, reps: number, weight: number | undefined, unit: string, existing: ISetLog | null) => void;
  onDeleteSet: (setLog: ISetLog) => void;
}

function useElapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function GuidedWorkoutSession({
  workout, allSetLogs, selectedDate, saving, onClose, onCommitSet, onDeleteSet,
}: GuidedWorkoutSessionProps) {
  const [index, setIndex] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const elapsed = useElapsed();

  const exercises = workout.Exercises;
  const exercise = exercises[index];
  const exerciseLogs = allSetLogs.filter(l => l.IdExercise === exercise?.IdExercise);

  const totalSets = exercises.reduce((sum, e) => {
    const logged = allSetLogs.filter(l => l.IdExercise === e.IdExercise).length;
    return sum + Math.max(e.Sets, logged);
  }, 0);
  const doneSets = exercises.reduce((sum, e) => sum + allSetLogs.filter(l => l.IdExercise === e.IdExercise).length, 0);

  if (!exercise) return null;

  const handleFinish = () => {
    if (totalSets > 0 && doneSets >= totalSets) toast.success("Nice work! Workout complete.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col">
      <div className="flex-shrink-0 px-4 pt-10 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
            <X className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{workout.WorkoutName}</p>
            <p className="text-[11px] text-gray-400 tabular-nums">{elapsed} · {doneSets}/{totalSets} sets</p>
          </div>
          <button onClick={handleFinish} className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-2">Exercise {index + 1} / {exercises.length}</p>
      </div>

      <GuidedExercisePanel
        exercise={exercise}
        todaySetLogs={exerciseLogs}
        selectedDate={selectedDate}
        saving={saving}
        onCommitSet={(setNumber, reps, weight, unit, existing) => onCommitSet(exercise, setNumber, reps, weight, unit, existing)}
        onDeleteSet={onDeleteSet}
        onOpenVideo={() => setVideoOpen(true)}
      />

      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
        <button onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0}
          className="flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button onClick={() => setIndex(i => Math.min(exercises.length - 1, i + 1))} disabled={index === exercises.length - 1}
          className="flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 disabled:opacity-30">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {videoOpen && exercise.VideoUrl && (
        <VideoSheet url={exercise.VideoUrl} title={exercise.ExerciseName} onClose={() => setVideoOpen(false)} />
      )}
    </div>
  );
}
