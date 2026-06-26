"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Check, Dumbbell, Video,
  Plus, Loader2, AlertCircle, ChevronDown, ChevronUp,
  BarChart2, Zap, ArrowLeft, MessageSquare, X, Trash2,
  Pencil, Play,
} from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";

import { Drawer, DrawerContent } from "../../components/ui/drawer";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Card, CardContent } from "../../components/ui/card";
import { MobileNav } from "../../components/layout/mobile-nav";
import { useAuth } from "../../hooks/use-auth";
import { queryClient } from "../../lib/queryClient";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import {
  getMyWorkouts, getMyWorkoutLogs, getMyWorkoutHistory,
  logSet, deleteSetLog, getSetLogsForDate,
} from "../../services/WorkoutService";
import {
  IWorkout, IExercise, IExerciseLog, ISetLog,
  mergeWorkoutWithLogs, WEIGHT_UNITS,
} from "../../interface/IWorkout";

// ── Video helpers ─────────────────────────────────────────────────

function getEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    // youtu.be/ID
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}?autoplay=1&mute=1&rel=0`;
    }
    // youtube.com/shorts/ID
    if (u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.replace("/shorts/", "");
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0`;
    }
    // youtube.com/watch?v=ID
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}?autoplay=1&mute=1&rel=0`;
    // already an embed or other direct video URL — use as-is
    return url;
  } catch {
    return url;
  }
}

function getYoutubeThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.replace("/shorts/", "");
    else id = u.searchParams.get("v");
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  } catch { return null; }
}

function VideoSheet({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const embedUrl = getEmbedUrl(url);
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-10 pb-3 bg-black">
        <p className="text-sm font-semibold text-white truncate flex-1 pr-3">{title}</p>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white flex-shrink-0">
          <X className="h-5 w-5" />
        </button>
      </div>
      {/* iframe fills remaining height */}
      <div className="flex-1 w-full">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────

function ddmmyyyy(m: moment.Moment) { return m.format("DD-MM-YYYY"); }
const isToday = (d: string) => d === ddmmyyyy(moment());

function buildWeek(center: string): string[] {
  const mon = moment(center, "DD-MM-YYYY").startOf("isoWeek");
  return Array.from({ length: 7 }, (_, i) => ddmmyyyy(mon.clone().add(i, "days")));
}

// ── Week Strip ────────────────────────────────────────────────────

function WeekStrip({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const week = buildWeek(selected);
  const labels = ["M","T","W","T","F","S","S"];
  const shift = (dir: -1|1) => onSelect(ddmmyyyy(moment(selected,"DD-MM-YYYY").add(dir*7,"days")));

  return (
    <div className="flex items-center gap-1 bg-blue-700/30 rounded-xl px-1 py-1 mt-3">
      <button onClick={() => shift(-1)} className="p-1.5 text-blue-200 hover:text-white transition-colors">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex flex-1 justify-around">
        {week.map((day, i) => {
          const active = day === selected;
          const todayDay = isToday(day);
          return (
            <button key={day} onClick={() => onSelect(day)} className="flex flex-col items-center gap-0.5 py-0.5">
              <span className={`text-[9px] font-medium ${active ? "text-white" : "text-blue-200"}`}>{labels[i]}</span>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                active ? "bg-white text-blue-700 font-bold shadow"
                : todayDay ? "border border-white/60 text-white"
                : "text-blue-100 hover:bg-white/10"
              }`}>
                <span className="text-xs font-semibold">{moment(day,"DD-MM-YYYY").date()}</span>
              </div>
            </button>
          );
        })}
      </div>
      <button onClick={() => shift(1)} className="p-1.5 text-blue-200 hover:text-white transition-colors">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Log Set Sheet ─────────────────────────────────────────────────

interface LogSetSheetProps {
  open: boolean;
  exercise: IExercise;
  setNumber: number;
  existing: ISetLog | null;
  prefill?: ISetLog | null;   // previous set's values — used when existing is null
  saving: boolean;
  onClose: () => void;
  onConfirm: (reps: number, weight: number | null, unit: string, notes: string) => void;
  onDelete?: () => void;
}

function LogSetSheet({ open, exercise, setNumber, existing, prefill, saving, onClose, onConfirm, onDelete }: LogSetSheetProps) {
  const source = existing ?? prefill;   // prefer existing log; fall back to previous set's values
  const [reps, setReps]     = useState(String(source?.RepsCompleted ?? exercise.TargetReps ?? 10));
  const [weight, setWeight] = useState(String(source?.WeightUsed ?? exercise.TargetWeight ?? ""));
  const [unit, setUnit]     = useState(source?.WeightUnit ?? exercise.WeightUnit ?? "kg");
  const [notes, setNotes]   = useState(existing?.Notes ?? "");   // notes not copied from prefill
  const [activeField, setActiveField] = useState<"reps"|"weight">("reps");

  useEffect(() => {
    if (open) {
      const src = existing ?? prefill;
      setReps(String(src?.RepsCompleted ?? exercise.TargetReps ?? 10));
      setWeight(String(src?.WeightUsed ?? exercise.TargetWeight ?? ""));
      setUnit(src?.WeightUnit ?? exercise.WeightUnit ?? "kg");
      setNotes(existing?.Notes ?? "");   // notes not copied from prefill
      setActiveField("reps");
    }
  }, [open, exercise, existing, prefill]);

  const numpad = (val: string) => {
    const setter = activeField === "reps" ? setReps : setWeight;
    setter(prev => {
      if (val === "⌫") return prev.slice(0,-1) || "0";
      if (val === "." && prev.includes(".")) return prev;
      if (prev === "0" && val !== ".") return val;
      return prev + val;
    });
  };

  const adj = (field: "reps"|"weight", delta: number) => {
    if (field === "reps") setReps(v => String(Math.max(1, parseInt(v)||0) + delta));
    else setWeight(v => String(Math.max(0, parseFloat(v)||0) + delta));
  };

  return (
    <Drawer open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DrawerContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-h-[90vh]">
        <div className="flex items-center justify-between px-5 pb-2">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{exercise.ExerciseName}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Set {setNumber} of {exercise.Sets} · Target {exercise.TargetReps} reps{exercise.TargetWeight ? ` @ ${exercise.TargetWeight}${exercise.WeightUnit ?? "kg"}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {existing && onDelete && (
              <button onClick={onDelete}
                className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 space-y-4 pb-6">
          {/* Dual input cards */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setActiveField("reps")}
              className={`rounded-2xl p-3 border-2 transition-colors text-left ${activeField === "reps"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"}`}>
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">REPS</p>
              <p className={`text-3xl font-bold tabular-nums ${activeField === "reps" ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-200"}`}>{reps}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {[-5,-1,+1,+5].map(d => (
                  <button key={d} onClick={e => { e.stopPropagation(); adj("reps",d); }}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/40">
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            </button>

            <button onClick={() => setActiveField("weight")}
              className={`rounded-2xl p-3 border-2 transition-colors text-left ${activeField === "weight"
                ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"}`}>
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">WEIGHT</p>
              <p className={`text-3xl font-bold tabular-nums ${activeField === "weight" ? "text-orange-600 dark:text-orange-400" : "text-gray-700 dark:text-gray-200"}`}>{weight || "—"}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {[-5,-2.5,+2.5,+5].map(d => (
                  <button key={d} onClick={e => { e.stopPropagation(); adj("weight",d); }}
                    className="text-[10px] font-semibold px-1 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/40">
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            </button>
          </div>

          {/* Unit selector */}
          <div className="flex gap-2">
            {WEIGHT_UNITS.map(u => (
              <button key={u} onClick={() => setUnit(u)}
                className={`flex-1 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                  unit === u
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                }`}>{u}</button>
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9",".","0","⌫"].map(k => (
              <button key={k} onClick={() => numpad(k)}
                className="h-12 rounded-xl font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-lg transition-colors active:scale-95">
                {k}
              </button>
            ))}
          </div>

          <Input placeholder="Add a note (optional)…" value={notes} onChange={e => setNotes(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm" />

          <button onClick={() => onConfirm(parseInt(reps)||0, weight ? parseFloat(weight) : null, unit, notes)}
            disabled={saving}
            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md">
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : <><Check className="h-4 w-4" strokeWidth={3} /> {existing ? "Update Set" : "Log Set"}</>}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── Swipeable row wrapper (swipe-left to delete) ──────────────────

function SwipeableRow({ onDelete, children, disabled }: {
  onDelete: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = React.useRef(0);
  const DELETE_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -DELETE_THRESHOLD - 20));
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setSwiping(false);
    if (offset <= -DELETE_THRESHOLD) {
      setOffset(-DELETE_THRESHOLD - 20);
      setTimeout(() => { onDelete(); setOffset(0); }, 150);
    } else {
      setOffset(0);
    }
  };

  const revealPct = Math.min(1, Math.abs(offset) / DELETE_THRESHOLD);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* delete background */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-red-500 rounded-xl"
        style={{ opacity: revealPct }}>
        <Trash2 className="h-4 w-4 text-white" />
      </div>
      {/* content */}
      <div
        style={{ transform: `translateX(${offset}px)`, transition: swiping ? "none" : "transform 0.2s ease" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// ── Exercise Row with inline sets ─────────────────────────────────

function ExerciseRow({ exercise, setLogs, workout, selectedDate, onLogSet, onDeleteSet, onAddExtraSet }: {
  exercise: IExercise;
  setLogs: ISetLog[];   // all set logs for this exercise on selectedDate
  workout: IWorkout;
  selectedDate: string;
  onLogSet: (ex: IExercise, setNumber: number, existing: ISetLog|null) => void;
  onDeleteSet: (setLog: ISetLog) => void;
  onAddExtraSet: (ex: IExercise, nextSetNum: number, prev: ISetLog) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const totalSets = exercise.Sets;
  const loggedSets = setLogs.filter(l => l.IdExercise === exercise.IdExercise);
  const doneCount = loggedSets.length;
  const allDone = doneCount >= totalSets;

  return (
    <div className={`border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${allDone ? "bg-green-50/40 dark:bg-green-950/10" : ""}`}>
      {/* exercise header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* thumbnail or fallback icon */}
        {exercise.VideoUrl ? (
          <button onClick={() => setVideoOpen(true)}
            className="relative w-12 h-9 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
            {getYoutubeThumbnail(exercise.VideoUrl)
              ? <img src={getYoutubeThumbnail(exercise.VideoUrl)!} alt={exercise.ExerciseName}
                  className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />}
            {/* play overlay */}
            <div className={`absolute inset-0 flex items-center justify-center transition-colors ${
              allDone ? "bg-green-500/80" : "bg-black/40"
            }`}>
              {allDone
                ? <Check className="h-4 w-4 text-white" strokeWidth={3} />
                : <Play className="h-3.5 w-3.5 text-white fill-white drop-shadow" />}
            </div>
            {/* set progress badge */}
            {doneCount > 0 && !allDone && (
              <div className="absolute bottom-0.5 right-0.5 bg-blue-600 rounded text-[8px] font-bold text-white px-1 leading-4">
                {doneCount}/{totalSets}
              </div>
            )}
          </button>
        ) : (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
            allDone ? "bg-green-500" : doneCount > 0 ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-700"
          }`}>
            {allDone
              ? <Check className="h-4 w-4 text-white" strokeWidth={3} />
              : doneCount > 0
                ? <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{doneCount}/{totalSets}</span>
                : <Dumbbell className="h-4 w-4 text-gray-400" />}
          </div>
        )}

        {/* name + progress */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${allDone ? "text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-200"}`}>
            {exercise.ExerciseName}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            <span className={doneCount > 0 ? "text-blue-600 dark:text-blue-400 font-semibold" : ""}>{doneCount}</span>
            <span>/{totalSets} sets</span>
            {exercise.TargetWeight
              ? <span className="ml-1">· {exercise.TargetReps} reps @ {exercise.TargetWeight}{exercise.WeightUnit ?? "kg"}</span>
              : <span className="ml-1">· {exercise.TargetReps} reps</span>}
          </p>
        </div>

        <button onClick={() => setExpanded(e => !e)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 flex-shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* inline set rows */}
      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {Array.from({ length: totalSets }, (_, i) => {
            const setNum = i + 1;
            const setLog = loggedSets.find(l => l.SetNumber === setNum) ?? null;
            const isLogged = !!setLog;
            // previous logged set for auto-fill
            const prevLog = setNum > 1
              ? (loggedSets.find(l => l.SetNumber === setNum - 1) ?? [...loggedSets].sort((a,b) => b.SetNumber - a.SetNumber)[0] ?? null)
              : null;

            const rowContent = (
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-colors ${
                isLogged
                  ? "bg-white dark:bg-gray-800 border-green-200 dark:border-green-800"
                  : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 border-dashed"
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                  isLogged ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                }`}>
                  {isLogged ? <Check className="h-3 w-3" strokeWidth={3} /> : setNum}
                </div>

                {isLogged ? (
                  <>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{setLog!.RepsCompleted} reps</span>
                      {setLog!.WeightUsed && (
                        <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">@ {setLog!.WeightUsed}{setLog!.WeightUnit ?? "kg"}</span>
                      )}
                      {setLog!.Notes && (
                        <span className="text-[11px] text-gray-400 truncate italic">"{setLog!.Notes}"</span>
                      )}
                    </div>
                    <button onClick={() => onLogSet(exercise, setNum, setLog)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 flex-shrink-0 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-xs text-gray-400 dark:text-gray-500">
                      {prevLog ? `${prevLog.RepsCompleted} reps${prevLog.WeightUsed ? ` @ ${prevLog.WeightUsed}${prevLog.WeightUnit ?? "kg"}` : ""} · tap to log` : "Set " + setNum + " — tap to log"}
                    </span>
                    <button
                      onClick={() => {
                        if (prevLog) {
                          onAddExtraSet(exercise, setNum, prevLog);
                        } else {
                          onLogSet(exercise, setNum, null);
                        }
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0">
                      <Plus className="h-3 w-3" /> Log
                    </button>
                  </>
                )}
              </div>
            );

            return (
              <SwipeableRow key={setNum} disabled={!isLogged} onDelete={() => setLog && onDeleteSet(setLog)}>
                {rowContent}
              </SwipeableRow>
            );
          })}

          {/* extra logged sets beyond assigned (if any) */}
          {loggedSets.filter(l => l.SetNumber > totalSets).map(setLog => (
            <SwipeableRow key={setLog.SetNumber} onDelete={() => onDeleteSet(setLog)}>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 border bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-blue-500 text-white">
                  {setLog.SetNumber}
                </div>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{setLog.RepsCompleted} reps</span>
                  {setLog.WeightUsed && <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">@ {setLog.WeightUsed}{setLog.WeightUnit ?? "kg"}</span>}
                  <Badge className="text-[9px] h-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0">Bonus</Badge>
                </div>
                <button onClick={() => onLogSet(exercise, setLog.SetNumber, setLog)}
                  className="p-1.5 text-gray-400 hover:text-blue-500 flex-shrink-0 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </SwipeableRow>
          ))}

          {/* add extra set button — auto-logs with last set's values if available */}
          <button
            onClick={() => {
              const nextSetNum = Math.max(totalSets, loggedSets.length) + 1;
              const lastLogged = [...loggedSets].sort((a,b) => b.SetNumber - a.SetNumber)[0];
              if (lastLogged) {
                onAddExtraSet(exercise, nextSetNum, lastLogged);
              } else {
                onLogSet(exercise, nextSetNum, null);
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 transition-colors">
            <Plus className="h-3 w-3" /> Add extra set
          </button>
        </div>
      )}

      {videoOpen && exercise.VideoUrl && (
        <VideoSheet url={exercise.VideoUrl} title={exercise.ExerciseName} onClose={() => setVideoOpen(false)} />
      )}
    </div>
  );
}

// ── Exercise Detail View ──────────────────────────────────────────

function ExerciseDetailView({ exercise, setLogs, historySetLogs, workout, selectedDate, onBack, onLogSet, onDeleteSet, onAddExtraSet }: {
  exercise: IExercise;
  setLogs: ISetLog[];
  historySetLogs: ISetLog[];
  workout: IWorkout;
  selectedDate: string;
  onBack: () => void;
  onLogSet: (ex: IExercise, setNumber: number, existing: ISetLog|null) => void;
  onDeleteSet: (setLog: ISetLog) => void;
  onAddExtraSet: (ex: IExercise, nextSetNum: number, prev: ISetLog) => void;
}) {
  const [tab, setTab] = useState<"sets"|"analyze">("sets");
  const [videoOpen, setVideoOpen] = useState(false);

  const todaySets = setLogs.filter(l => l.IdExercise === exercise.IdExercise && l.LogDate === selectedDate)
    .sort((a,b) => a.SetNumber - b.SetNumber);

  const allHistorySets = [...setLogs, ...historySetLogs]
    .filter(l => l.IdExercise === exercise.IdExercise)
    .sort((a,b) => moment(b.LogDate,"DD-MM-YYYY").valueOf() - moment(a.LogDate,"DD-MM-YYYY").valueOf());

  // group by date for history display
  const byDate: Record<string, ISetLog[]> = {};
  allHistorySets.forEach(l => { (byDate[l.LogDate] = byDate[l.LogDate] ?? []).push(l); });
  const dates = Object.keys(byDate).sort((a,b) => moment(b,"DD-MM-YYYY").valueOf() - moment(a,"DD-MM-YYYY").valueOf());

  // for chart — one data point per session (best set of that day)
  const sessions = dates.slice(0,8).map(d => {
    const sets = byDate[d];
    return {
      date: d,
      maxReps: Math.max(...sets.map(s => s.RepsCompleted)),
      maxWeight: sets.reduce((m,s) => Math.max(m, s.WeightUsed ?? 0), 0),
      setCount: sets.length,
    };
  }).reverse();

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-blue-600 px-4 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 text-white/80 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{exercise.ExerciseName}</h2>
            <p className="text-xs text-blue-200">{workout.WorkoutName}</p>
          </div>
          {exercise.VideoUrl && (
            <button onClick={() => setVideoOpen(true)}
              className="p-2 bg-white/20 rounded-xl text-white hover:bg-white/30">
              <Video className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-3 bg-white/15 rounded-2xl px-4 py-3 flex items-center gap-4">
          <Zap className="h-5 w-5 text-yellow-300 flex-shrink-0" />
          <div className="flex gap-4 flex-1 flex-wrap">
            <div>
              <p className="text-[10px] text-blue-200">Sets</p>
              <p className="text-base font-bold text-white">{exercise.Sets}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-200">Reps</p>
              <p className="text-base font-bold text-white">{exercise.TargetReps}</p>
            </div>
            {exercise.TargetWeight && (
              <div>
                <p className="text-[10px] text-blue-200">Weight</p>
                <p className="text-base font-bold text-orange-300">{exercise.TargetWeight}{exercise.WeightUnit ?? "kg"}</p>
              </div>
            )}
            {exercise.RestSeconds && (
              <div>
                <p className="text-[10px] text-blue-200">Rest</p>
                <p className="text-base font-bold text-white">{exercise.RestSeconds}s</p>
              </div>
            )}
          </div>
          {todaySets.length >= exercise.Sets && (
            <div className="flex items-center gap-1 bg-green-500 px-2.5 py-1 rounded-full">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
              <span className="text-xs font-bold text-white">Done</span>
            </div>
          )}
        </div>
      </div>

      {/* tabs */}
      <div className="flex-shrink-0 flex bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        {(["sets","analyze"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              tab === t ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400" : "text-gray-500 dark:text-gray-400"
            }`}>
            {t === "sets" ? <Dumbbell className="h-3.5 w-3.5" /> : <BarChart2 className="h-3.5 w-3.5" />}
            {t === "sets" ? "Sets" : "Progress"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-28 bg-gray-50 dark:bg-gray-950">
        {tab === "sets" && (
          <>
            {/* today's set rows */}
            <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">Today's Sets</p>
                <Badge className={`text-[10px] h-5 border-0 ${
                  todaySets.length >= exercise.Sets
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                }`}>{todaySets.length}/{exercise.Sets}</Badge>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {Array.from({ length: Math.max(exercise.Sets, todaySets.length) }, (_, i) => {
                  const setNum = i + 1;
                  const setLog = todaySets.find(l => l.SetNumber === setNum) ?? null;
                  const isBonus = setNum > exercise.Sets;
                  return (
                    <div key={setNum} className={`flex items-center gap-3 px-4 py-3 ${setLog ? "bg-green-50/30 dark:bg-green-950/10" : ""}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                        setLog ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                      }`}>
                        {setLog ? <Check className="h-3 w-3" strokeWidth={3} /> : setNum}
                      </div>
                      <div className="flex-1 min-w-0">
                        {setLog ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{setLog.RepsCompleted} reps</span>
                            {setLog.WeightUsed && <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">@ {setLog.WeightUsed}{setLog.WeightUnit ?? "kg"}</span>}
                            {isBonus && <Badge className="text-[9px] h-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0">Bonus</Badge>}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not logged yet</span>
                        )}
                        {setLog?.Notes && <p className="text-[11px] text-gray-400 italic mt-0.5">"{setLog.Notes}"</p>}
                      </div>
                      <button
                        onClick={() => onLogSet(exercise, setNum, setLog)}
                        className={`p-1.5 flex-shrink-0 rounded-lg transition-colors ${
                          setLog
                            ? "text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100"
                        }`}>
                        {setLog ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
                {/* add extra set — auto-logs with last set values */}
                <button
                  onClick={() => {
                    const nextSetNum = Math.max(exercise.Sets, todaySets.length) + 1;
                    const lastLogged = [...todaySets].sort((a,b) => b.SetNumber - a.SetNumber)[0];
                    if (lastLogged) {
                      onAddExtraSet(exercise, nextSetNum, lastLogged);
                    } else {
                      onLogSet(exercise, nextSetNum, null);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <Plus className="h-3 w-3" /> Add extra set
                </button>
              </div>
            </Card>

            {/* past sessions */}
            {dates.filter(d => d !== selectedDate).slice(0,5).map(d => (
              <Card key={d} className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
                <CardContent className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">{moment(d,"DD-MM-YYYY").format("ddd, D MMM")}</p>
                  <div className="space-y-1">
                    {byDate[d].map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-[10px] font-bold text-gray-400">{s.SetNumber}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{s.RepsCompleted} reps</span>
                        {s.WeightUsed && <span className="text-orange-600 dark:text-orange-400">{s.WeightUsed}{s.WeightUnit ?? "kg"}</span>}
                        {s.Notes && <span className="text-xs text-gray-400 italic truncate">"{s.Notes}"</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {dates.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No history yet. Log your first set!</p>}
          </>
        )}

        {tab === "analyze" && (
          <>
            {sessions.length > 0 ? (
              <>
                <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
                  <CardContent className="px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 mb-3">Max Reps per Session</p>
                    <div className="flex items-end gap-1.5 h-20">
                      {sessions.map((s, i) => {
                        const max = Math.max(...sessions.map(x => x.maxReps), 1);
                        const pct = (s.maxReps / max) * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] text-gray-400">{s.maxReps}</span>
                            <div className="w-full rounded-t-sm bg-blue-500" style={{height:`${Math.max(4, pct * 0.6)}px`}} />
                            <span className="text-[8px] text-gray-400">{moment(s.date,"DD-MM-YYYY").format("D/M")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {sessions.some(s => s.maxWeight > 0) && (
                  <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
                    <CardContent className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 mb-3">Max Weight per Session</p>
                      <div className="flex items-end gap-1.5 h-20">
                        {sessions.map((s, i) => {
                          const max = Math.max(...sessions.map(x => x.maxWeight), 1);
                          const pct = (s.maxWeight / max) * 100;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[9px] text-gray-400">{s.maxWeight || "—"}</span>
                              <div className="w-full rounded-t-sm bg-orange-400" style={{height:`${Math.max(4, pct * 0.6)}px`}} />
                              <span className="text-[8px] text-gray-400">{moment(s.date,"DD-MM-YYYY").format("D/M")}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
                  <CardContent className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500">Best Performance</p>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] text-gray-400">Max Reps</p>
                        <p className="text-base font-bold text-blue-600 dark:text-blue-400">{Math.max(...sessions.map(s => s.maxReps))}</p>
                      </div>
                      {sessions.some(s => s.maxWeight > 0) && (
                        <div>
                          <p className="text-[10px] text-gray-400">Max Weight</p>
                          <p className="text-base font-bold text-orange-600 dark:text-orange-400">{Math.max(...sessions.map(s => s.maxWeight))}kg</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-gray-400">Sessions</p>
                        <p className="text-base font-bold text-gray-700 dark:text-gray-200">{sessions.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-center text-sm text-gray-400 py-12">Log some sets to see progress!</p>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 right-5">
        <button
          onClick={() => {
            const nextSet = Math.max(exercise.Sets, todaySets.length) + (todaySets.length >= exercise.Sets ? 1 : 0);
            const unlogged = Array.from({length: exercise.Sets}, (_, i) => i+1).find(n => !todaySets.find(l => l.SetNumber === n));
            onLogSet(exercise, unlogged ?? nextSet, null);
          }}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-colors active:scale-95">
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>

      {videoOpen && exercise.VideoUrl && (
        <VideoSheet url={exercise.VideoUrl} title={exercise.ExerciseName} onClose={() => setVideoOpen(false)} />
      )}
    </div>
  );
}

// ── Workout Card ──────────────────────────────────────────────────

function WorkoutCard({ workout, setLogs, onExerciseClick, onLogSet, onDeleteSet, onAddExtraSet }: {
  workout: IWorkout;
  setLogs: ISetLog[];
  onExerciseClick: (ex: IExercise) => void;
  onLogSet: (ex: IExercise, setNumber: number, existing: ISetLog|null) => void;
  onDeleteSet: (setLog: ISetLog) => void;
  onAddExtraSet: (ex: IExercise, nextSetNum: number, prev: ISetLog) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // compute completion based on set logs
  const totalSets   = workout.Exercises.reduce((s, ex) => s + ex.Sets, 0);
  const loggedSets  = setLogs.filter(l => workout.Exercises.some(ex => ex.IdExercise === l.IdExercise)).length;
  const completePct = totalSets > 0 ? Math.min(100, Math.round((loggedSets / totalSets) * 100)) : 0;
  const doneExCount = workout.Exercises.filter(ex => {
    const exLogs = setLogs.filter(l => l.IdExercise === ex.IdExercise);
    return exLogs.length >= ex.Sets;
  }).length;

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{workout.WorkoutName}</h3>
              <p className="text-[11px] text-gray-400">
                {doneExCount}/{workout.Exercises.length} exercises · {loggedSets}/{totalSets} sets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-sm font-bold ${
              completePct === 100 ? "text-green-600 dark:text-green-400"
              : completePct > 0 ? "text-orange-600 dark:text-orange-400"
              : "text-gray-300 dark:text-gray-600"
            }`}>{completePct}%</span>
            <button onClick={() => setExpanded(e => !e)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-500">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="mt-2">
          <Progress value={completePct} className="h-1.5" />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {workout.Exercises.map((ex, i) => (
            <ExerciseRow
              key={i}
              exercise={ex}
              setLogs={setLogs.filter(l => l.IdExercise === ex.IdExercise)}
              workout={workout}
              selectedDate={""} // not needed here
              onLogSet={onLogSet}
              onDeleteSet={onDeleteSet}
              onAddExtraSet={onAddExtraSet}
            />
          ))}
        </div>
      )}

      {workout.Notes && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-start gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-400 italic">{workout.Notes}</p>
        </div>
      )}
    </Card>
  );
}

// ── History Card ──────────────────────────────────────────────────

function HistoryCard({ workout, logs }: { workout: IWorkout; logs: IExerciseLog[] }) {
  const [expanded, setExpanded] = useState(false);
  const merged = mergeWorkoutWithLogs(workout, logs);

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full px-4 py-3 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Dumbbell className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{workout.WorkoutName}</p>
              <p className="text-[10px] text-gray-400">{moment(workout.ScheduledDate,"DD-MM-YYYY").format("ddd, D MMM")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] h-5 border-0 ${
              merged.completionPercent === 100
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            }`}>{merged.completedCount}/{merged.totalCount}</Badge>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-1.5">
          {workout.Exercises.map((ex, i) => {
            const log = logs.find(l => l.IdExercise === ex.IdExercise && l.IsCompleted === 1);
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{ex.ExerciseName}</span>
                <span className={log ? "text-green-600 dark:text-green-400" : "text-gray-400"}>
                  {log ? `${log.SetsCompleted}×${log.RepsCompleted}${log.WeightUsed ? ` · ${log.WeightUsed}kg` : ""}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function WorkoutTrackingPage() {
  const { user } = useAuth();
  useEffect(() => { setBaseUrl(BASE_URL); }, []);

  const [selectedDate, setSelectedDate] = useState(ddmmyyyy(moment()));
  const [detailEx, setDetailEx] = useState<IExercise|null>(null);
  const [detailWk, setDetailWk] = useState<IWorkout|null>(null);
  const [logSheet, setLogSheet] = useState<{ex: IExercise; setNumber: number; existing: ISetLog|null; prefill: ISetLog|null}|null>(null);
  const [tab, setTab] = useState<"today"|"history">("today");

  // ── Queries ──────────────────────────────────────────────────────

  const { data: workoutsRes, isLoading: workoutsLoading, isError } = useQuery({
    queryKey: ["my-workouts", selectedDate],
    queryFn: () => getMyWorkouts({ ScheduledDate: selectedDate }),
    enabled: !!user,
    staleTime: 30_000,
  });
  const workouts: IWorkout[] = workoutsRes?.data?.data ?? [];

  const { data: setLogsRes, refetch: refetchSetLogs } = useQuery({
    queryKey: ["my-set-logs", selectedDate],
    queryFn: () => getSetLogsForDate({ LogDate: selectedDate }),
    enabled: !!user,
    staleTime: 30_000,
  });
  const allSetLogs: ISetLog[] = setLogsRes?.data?.data ?? [];

  const { data: historyRes } = useQuery({
    queryKey: ["my-workout-history"],
    queryFn: () => getMyWorkoutHistory({}),
    enabled: !!user && tab === "history",
    staleTime: 60_000,
  });
  const historyWorkouts: IWorkout[] = historyRes?.data?.data?.workouts ?? [];
  const historyLogs: IExerciseLog[] = historyRes?.data?.data?.logs ?? [];

  // ── Mutations ────────────────────────────────────────────────────

  const invalidateSetLogs = () => refetchSetLogs();

  const logSetMut = useMutation({
    mutationFn: logSet,
    onSuccess: () => {
      invalidateSetLogs();
      setLogSheet(null);
      toast.success("Set logged!");
    },
    onError: () => toast.error("Failed to log"),
  });

  const deleteSetMut = useMutation({
    mutationFn: deleteSetLog,
    onSuccess: () => { invalidateSetLogs(); toast.success("Set removed"); },
    onError: () => toast.error("Failed to remove"),
  });

  const handleLogSet = (ex: IExercise, setNumber: number, existing: ISetLog|null) => {
    // when logging a new set (not editing), pre-fill from the most recently logged set of this exercise
    let prefill: ISetLog|null = null;
    if (!existing && setNumber > 1) {
      const prevSets = allSetLogs
        .filter(l => l.IdExercise === ex.IdExercise)
        .sort((a, b) => b.SetNumber - a.SetNumber);
      prefill = prevSets[0] ?? null;
    }
    setLogSheet({ ex, setNumber, existing, prefill });
  };

  // auto-log extra set instantly using the previous set's reps/weight — no sheet required
  const handleAddExtraSet = (ex: IExercise, nextSetNum: number, prev: ISetLog) => {
    const wk = workouts.find(w => w.Exercises.some(e => e.IdExercise === ex.IdExercise));
    if (!wk || !user) return;
    logSetMut.mutate({
      IdExercise:    ex.IdExercise!,
      IdWorkout:     wk.IdWorkout!,
      IdUser:        user.info.IsUser,
      LogDate:       selectedDate,
      SetNumber:     nextSetNum,
      RepsCompleted: prev.RepsCompleted,
      WeightUsed:    prev.WeightUsed,
      WeightUnit:    prev.WeightUnit ?? ex.WeightUnit ?? "kg",
    } as ISetLog);
  };

  const handleDeleteSet = (setLog: ISetLog) => {
    if (!setLog.IdSetLog) return;
    deleteSetMut.mutate({ IdSetLog: setLog.IdSetLog });
    setLogSheet(null);
  };

  const handleConfirm = (reps: number, weight: number|null, unit: string, notes: string) => {
    if (!logSheet || !user) return;
    const wk = workouts.find(w => w.Exercises.some(e => e.IdExercise === logSheet.ex.IdExercise));
    if (!wk) return;
    logSetMut.mutate({
      ...(logSheet.existing ?? {}),
      IdExercise:    logSheet.ex.IdExercise!,
      IdWorkout:     wk.IdWorkout!,
      IdUser:        user.info.IsUser,
      LogDate:       selectedDate,
      SetNumber:     logSheet.setNumber,
      RepsCompleted: reps,
      WeightUsed:    weight ?? undefined,
      WeightUnit:    unit,
      Notes:         notes || undefined,
    } as ISetLog);
  };

  // stats summary
  const totalSets = allSetLogs.length;
  const totalReps = allSetLogs.reduce((s,l) => s + l.RepsCompleted, 0);
  const totalVol  = allSetLogs.reduce((s,l) => s + ((l.WeightUsed ?? 0) * l.RepsCompleted), 0);
  const doneExCount = workouts.reduce((count, wk) =>
    count + wk.Exercises.filter(ex => allSetLogs.filter(l => l.IdExercise === ex.IdExercise).length >= ex.Sets).length
  , 0);
  const totalExCount = workouts.reduce((s,w) => s + w.Exercises.length, 0);

  // ── Exercise detail screen ──────────────────────────────────────
  if (detailEx && detailWk) {
    return (
      <>
        <ExerciseDetailView
          exercise={detailEx}
          setLogs={allSetLogs}
          historySetLogs={[]}
          workout={detailWk}
          selectedDate={selectedDate}
          onBack={() => { setDetailEx(null); setDetailWk(null); }}
          onLogSet={handleLogSet}
          onDeleteSet={handleDeleteSet}
          onAddExtraSet={handleAddExtraSet}
        />
        {logSheet && (
          <LogSetSheet
            open={!!logSheet}
            exercise={logSheet.ex}
            setNumber={logSheet.setNumber}
            existing={logSheet.existing}
            prefill={logSheet.prefill}
            saving={logSetMut.isPending}
            onClose={() => setLogSheet(null)}
            onConfirm={handleConfirm}
            onDelete={logSheet.existing ? () => handleDeleteSet(logSheet.existing!) : undefined}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-blue-600 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-white" />
            <span className="text-lg font-bold text-white">Workouts</span>
          </div>
          {allSetLogs.length > 0 && (
            <Badge className="text-[10px] h-5 bg-white/20 text-white border-0">{doneExCount}/{totalExCount} exercises done</Badge>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20"
            onClick={() => setSelectedDate(ddmmyyyy(moment(selectedDate,"DD-MM-YYYY").subtract(1,"day")))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-white">
            {moment(selectedDate,"DD-MM-YYYY").format("ddd, D MMM YYYY")}
            {isToday(selectedDate) && <Badge className="ml-2 text-[10px] h-4 bg-white/20 text-white border-0">Today</Badge>}
          </span>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20"
            onClick={() => setSelectedDate(ddmmyyyy(moment(selectedDate,"DD-MM-YYYY").add(1,"day")))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <WeekStrip selected={selectedDate} onSelect={setSelectedDate} />
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        {(["today","history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-500 dark:text-gray-400"
            }`}>
            {t === "today" ? "Today" : "History"}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28 bg-gray-50 dark:bg-gray-950 space-y-3">

        {tab === "today" && (
          <>
            {/* Stats row */}
            {allSetLogs.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Sets",    value: totalSets,            color: "text-gray-700 dark:text-gray-200" },
                  { label: "Reps",    value: totalReps,            color: "text-blue-600 dark:text-blue-400" },
                  { label: "Vol(kg)", value: totalVol.toFixed(0),  color: "text-orange-600 dark:text-orange-400" },
                  { label: "Done",    value: doneExCount,          color: "text-green-600 dark:text-green-400" },
                ].map(({ label, value, color }) => (
                  <Card key={label} className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
                    <CardContent className="px-2 py-2 text-center">
                      <p className={`text-base font-bold ${color}`}>{value}</p>
                      <p className="text-[9px] text-gray-400">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {workoutsLoading && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              </div>
            )}

            {isError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" /> Failed to load workouts.
              </div>
            )}

            {!workoutsLoading && !isError && workouts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <Dumbbell className="h-7 w-7 text-gray-400 dark:text-gray-600" />
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No workouts scheduled</p>
                <p className="text-xs text-gray-400 mt-1">Your coach hasn't assigned a workout for this day yet.</p>
              </div>
            )}

            {!workoutsLoading && workouts.map(w => (
              <WorkoutCard
                key={w.IdWorkout}
                workout={w}
                setLogs={allSetLogs.filter(l => w.Exercises.some(ex => ex.IdExercise === l.IdExercise))}
                onExerciseClick={ex => { setDetailEx(ex); setDetailWk(w); }}
                onLogSet={handleLogSet}
                onDeleteSet={handleDeleteSet}
                onAddExtraSet={handleAddExtraSet}
              />
            ))}
          </>
        )}

        {tab === "history" && (
          historyWorkouts.length === 0
            ? <div className="flex flex-col items-center justify-center py-16 text-center">
                <Dumbbell className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
                <p className="text-sm text-gray-400">No workout history yet.</p>
              </div>
            : historyWorkouts.map(w => (
                <HistoryCard key={w.IdWorkout} workout={w}
                  logs={historyLogs.filter(l => l.IdWorkout === w.IdWorkout)} />
              ))
        )}
      </main>

      <MobileNav />

      {logSheet && (
        <LogSetSheet
          open={!!logSheet}
          exercise={logSheet.ex}
          setNumber={logSheet.setNumber}
          existing={logSheet.existing}
          saving={logSetMut.isPending}
          onClose={() => setLogSheet(null)}
          onConfirm={handleConfirm}
          onDelete={logSheet.existing ? () => handleDeleteSet(logSheet.existing!) : undefined}
        />
      )}
    </div>
  );
}
