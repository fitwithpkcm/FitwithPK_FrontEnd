"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import {
  Plus, Trash2, Pencil, Check, Dumbbell, Video,
  ChevronLeft, ChevronRight, ArrowRightLeft, Eye,
  AlertCircle, ChevronDown, ChevronUp, Loader2, User, X,
  MessageSquare, BookOpen, Search, CalendarDays, Copy, LayoutGrid, BarChart2,
} from "lucide-react";
import WorkoutProgressCharts from "../../components/workout/WorkoutProgressCharts";
import moment from "moment";
import toast from "react-hot-toast";

import { Drawer, DrawerContent } from "../../components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Card, CardContent } from "../../components/ui/card";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { queryClient } from "../../lib/queryClient";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { getUserListForACoach } from "../../services/AdminServices";
import {
  getWorkoutsForClient, createWorkout, updateWorkout,
  deleteWorkout, rescheduleWorkout, getWorkoutLogsForClient, getClientSetLogs,
  getExerciseLibrary, createLibraryItem, updateLibraryItem, deleteLibraryItem,
  bulkCreateWorkouts,
  getWorkoutTemplates, createWorkoutTemplate, updateWorkoutTemplate, deleteWorkoutTemplate,
} from "../../services/WorkoutService";
import {
  IWorkout, IExercise, IExerciseLog, ISetLog, IExerciseLibraryItem,
  createBlankWorkout, createBlankExercise, mergeWorkoutWithLogs, WEIGHT_UNITS, WORKOUT_TYPES,
  IWorkoutTemplate, ITemplateExercise, createBlankTemplate, createBlankTemplateExercise,
} from "../../interface/IWorkout";
import { IUser } from "../../interface/models/User";

// ── helpers ───────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  'Upper Body': 'bg-blue-500 text-white',
  'Lower Body': 'bg-purple-500 text-white',
  'Push':       'bg-orange-500 text-white',
  'Pull':       'bg-cyan-500 text-white',
  'Legs':       'bg-indigo-500 text-white',
  'Full Body':  'bg-emerald-500 text-white',
  'Cardio':     'bg-red-500 text-white',
  'Mobility':   'bg-amber-500 text-white',
  'Rest Day':   'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
};

function ddmmyyyy(m: moment.Moment) { return m.format("DD-MM-YYYY"); }
function dateInputToFmt(v: string) {
  if (!v) return "";
  const [y, m, d] = v.split("-"); return `${d}-${m}-${y}`;
}
function fmtToDateInput(v: string) {
  if (!v) return "";
  const [d, m, y] = v.split("-"); return `${y}-${m}-${d}`;
}
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
    <div className="flex items-center gap-1 bg-blue-700/30 rounded-xl px-1 py-1 mt-2">
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

// ── Exercise Name Input with Library Dropdown ─────────────────────

function ExerciseNameInput({ value, library, onChange, onSelectFromLibrary }: {
  value: string;
  library: IExerciseLibraryItem[];
  onChange: (v: string) => void;
  onSelectFromLibrary: (item: IExerciseLibraryItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // sync search when value changes externally
  useEffect(() => { setSearch(value); }, [value]);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search.trim()
    ? library.filter(l => l.ExerciseName.toLowerCase().includes(search.toLowerCase()))
    : library;

  const handleInput = (v: string) => {
    setSearch(v);
    onChange(v);
    setOpen(true);
  };

  const handleSelect = (item: IExerciseLibraryItem) => {
    setSearch(item.ExerciseName);
    setOpen(false);
    onSelectFromLibrary(item);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Input
        placeholder="Exercise name *"
        value={search}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        className="h-8 text-sm bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-400 font-medium focus-visible:ring-0 px-0"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.slice(0, 20).map((item, i) => (
            <button
              key={item.IdLibraryItem ?? i}
              onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.ExerciseName}</p>
                {item.Category && (
                  <p className="text-[10px] text-gray-400">{item.Category}</p>
                )}
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                {item.DefaultSets}×{item.DefaultReps}{item.DefaultWeight ? ` · ${item.DefaultWeight}${item.WeightUnit ?? "kg"}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Exercise Editor Row ───────────────────────────────────────────

function ExerciseEditorRow({ ex, index, library, onChange, onRemove }: {
  ex: IExercise; index: number;
  library: IExerciseLibraryItem[];
  onChange: (i: number, f: keyof IExercise, v: string|number) => void;
  onRemove: (i: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const handleSelectFromLibrary = (item: IExerciseLibraryItem) => {
    // Patch all fields at once via individual onChange calls
    onChange(index, "ExerciseName", item.ExerciseName);
    onChange(index, "Sets", item.DefaultSets);
    onChange(index, "TargetReps", item.DefaultReps);
    if (item.DefaultWeight) onChange(index, "TargetWeight", item.DefaultWeight);
    if (item.WeightUnit) onChange(index, "WeightUnit", item.WeightUnit);
    if (item.RestSeconds) onChange(index, "RestSeconds", item.RestSeconds);
    if (item.VideoUrl) onChange(index, "VideoUrl", item.VideoUrl);
    if (item.Notes) onChange(index, "Notes", item.Notes);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-xs font-bold text-gray-400 w-5">{index + 1}</span>
        <ExerciseNameInput
          value={ex.ExerciseName}
          library={library}
          onChange={v => onChange(index, "ExerciseName", v)}
          onSelectFromLibrary={handleSelectFromLibrary}
        />
        <button onClick={() => setExpanded(e => !e)} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button onClick={() => onRemove(index)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Sets</label>
              <Input type="number" min={1} value={ex.Sets}
                onChange={e => onChange(index, "Sets", parseInt(e.target.value)||1)}
                className="h-8 text-sm text-center" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Reps</label>
              <Input type="number" min={1} value={ex.TargetReps}
                onChange={e => onChange(index, "TargetReps", parseInt(e.target.value)||1)}
                className="h-8 text-sm text-center" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Weight</label>
              <Input type="number" min={0} placeholder="—" value={ex.TargetWeight ?? ""}
                onChange={e => onChange(index, "TargetWeight", parseFloat(e.target.value)||0)}
                className="h-8 text-sm text-center" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Unit</label>
              <select value={ex.WeightUnit ?? "kg"} onChange={e => onChange(index,"WeightUnit",e.target.value)}
                className="w-full h-8 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 text-gray-800 dark:text-gray-200">
                {WEIGHT_UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Rest (sec)</label>
              <Input type="number" min={0} placeholder="Optional" value={ex.RestSeconds ?? ""}
                onChange={e => onChange(index,"RestSeconds",parseInt(e.target.value)||0)}
                className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Video URL</label>
            <Input placeholder="https://youtube.com/..." value={ex.VideoUrl ?? ""}
              onChange={e => onChange(index,"VideoUrl",e.target.value)}
              className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Coaching note</label>
            <Input placeholder="Instructions for client..." value={ex.Notes ?? ""}
              onChange={e => onChange(index,"Notes",e.target.value)}
              className="h-8 text-sm" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Workout Editor Drawer ─────────────────────────────────────────

function WorkoutEditorDrawer({ open, initial, saving, library, onClose, onSave }: {
  open: boolean; initial: IWorkout | null; saving: boolean;
  library: IExerciseLibraryItem[];
  onClose: () => void; onSave: (w: IWorkout) => void;
}) {
  const [workout, setWorkout] = useState<IWorkout | null>(null);

  useEffect(() => { if (open && initial) setWorkout(JSON.parse(JSON.stringify(initial))); }, [open, initial]);
  if (!workout) return null;

  const setField = (f: keyof IWorkout, v: string) => setWorkout(w => w ? { ...w, [f]: v } : w);
  const addEx = () => setWorkout(w => w ? { ...w, Exercises: [...w.Exercises, createBlankExercise(w.Exercises.length)] } : w);
  const removeEx = (i: number) => setWorkout(w => w ? { ...w, Exercises: w.Exercises.filter((_,idx) => idx !== i) } : w);
  const changeEx = (i: number, f: keyof IExercise, v: string|number) =>
    setWorkout(w => { if (!w) return w; const exs = [...w.Exercises]; exs[i] = {...exs[i],[f]:v}; return {...w, Exercises: exs}; });

  const handleSave = () => {
    if (!workout.WorkoutName.trim()) { toast.error("Workout name required"); return; }
    if (workout.Exercises.length === 0) { toast.error("Add at least one exercise"); return; }
    for (const ex of workout.Exercises) if (!ex.ExerciseName.trim()) { toast.error("All exercises need a name"); return; }
    onSave(workout);
  };

  return (
    <Drawer open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DrawerContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-h-[90vh]">
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {workout.IdWorkout ? "Edit Workout" : "New Workout"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 space-y-3 pb-6">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Workout Name *</label>
            <Input placeholder="e.g. Upper Body Strength" value={workout.WorkoutName}
              onChange={e => setField("WorkoutName", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Scheduled Date *</label>
            <Input type="date" value={fmtToDateInput(workout.ScheduledDate)}
              onChange={e => setField("ScheduledDate", dateInputToFmt(e.target.value))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Coach Notes</label>
            <Input placeholder="Notes for this session..." value={workout.Notes ?? ""}
              onChange={e => setField("Notes", e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Exercises <span className="text-gray-400">({workout.Exercises.length})</span>
              </label>
              <button onClick={addEx}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full transition-colors">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            {library.length > 0 && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Type a name to pick from your exercise library, or enter a custom name.
              </p>
            )}
            <div className="space-y-2">
              {workout.Exercises.length === 0 ? (
                <button onClick={addEx}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-400 hover:border-blue-300 hover:text-blue-500 flex flex-col items-center gap-2 transition-colors">
                  <Plus className="h-6 w-6" />
                  <span className="text-sm">Add your first exercise</span>
                </button>
              ) : workout.Exercises.map((ex, i) => (
                <ExerciseEditorRow key={i} ex={ex} index={i} library={library} onChange={changeEx} onRemove={removeEx} />
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md">
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : <><Check className="h-4 w-4" strokeWidth={3} /> Save Workout</>}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── Exercise Library Manager ──────────────────────────────────────

const CATEGORIES = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio", "Full Body", "Other"];

function blankLibraryItem(): IExerciseLibraryItem {
  return { ExerciseName: "", Category: "", DefaultSets: 3, DefaultReps: 10 };
}

function LibraryManager({ library, onRefresh }: {
  library: IExerciseLibraryItem[];
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<IExerciseLibraryItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const createMut = useMutation({
    mutationFn: createLibraryItem,
    onSuccess: () => { toast.success("Exercise added to library"); onRefresh(); setEditOpen(false); },
    onError: () => toast.error("Failed to add"),
  });
  const updateMut = useMutation({
    mutationFn: updateLibraryItem,
    onSuccess: () => { toast.success("Updated"); onRefresh(); setEditOpen(false); },
    onError: () => toast.error("Failed to update"),
  });
  const deleteMut = useMutation({
    mutationFn: deleteLibraryItem,
    onSuccess: () => { toast.success("Removed"); onRefresh(); },
    onError: () => toast.error("Failed to remove"),
  });

  const filtered = search.trim()
    ? library.filter(l => l.ExerciseName.toLowerCase().includes(search.toLowerCase()) ||
        (l.Category ?? "").toLowerCase().includes(search.toLowerCase()))
    : library;

  const grouped: Record<string, IExerciseLibraryItem[]> = {};
  filtered.forEach(item => {
    const cat = item.Category || "Uncategorised";
    (grouped[cat] = grouped[cat] ?? []).push(item);
  });

  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    if (!editItem?.ExerciseName.trim()) { toast.error("Exercise name required"); return; }
    if (editItem.IdLibraryItem) updateMut.mutate(editItem);
    else createMut.mutate(editItem);
  };

  return (
    <>
      <div className="space-y-3">
        {/* search + add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search exercises…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-gray-800" />
          </div>
          <button onClick={() => { setEditItem(blankLibraryItem()); setEditOpen(true); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex-shrink-0">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        {library.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <BookOpen className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-semibold text-gray-500">Exercise library is empty</p>
            <p className="text-xs text-gray-400 mt-1">Add exercises here to quickly pick them when creating workouts.</p>
            <button onClick={() => { setEditItem(blankLibraryItem()); setEditOpen(true); }}
              className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
              <Plus className="h-4 w-4" /> Add first exercise
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No exercises match "{search}"</p>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5 px-1">{cat}</p>
              <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 overflow-hidden">
                {items.map((item, i) => (
                  <div key={item.IdLibraryItem} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.ExerciseName}</p>
                      <p className="text-[11px] text-gray-400">
                        {item.DefaultSets}×{item.DefaultReps}
                        {item.DefaultWeight ? ` · ${item.DefaultWeight}${item.WeightUnit ?? "kg"}` : ""}
                        {item.RestSeconds ? ` · ${item.RestSeconds}s rest` : ""}
                      </p>
                    </div>
                    <button onClick={() => { setEditItem({ ...item }); setEditOpen(true); }}
                      className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (!confirm(`Remove "${item.ExerciseName}" from library?`)) return; deleteMut.mutate({ IdLibraryItem: item.IdLibraryItem! }); }}
                      className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={v => { if (!v) setEditOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              {editItem?.IdLibraryItem ? "Edit Exercise" : "Add to Library"}
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3 py-1">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Exercise Name *</label>
                <Input placeholder="e.g. Bench Press" value={editItem.ExerciseName}
                  onChange={e => setEditItem({ ...editItem, ExerciseName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Category</label>
                <select value={editItem.Category ?? ""}
                  onChange={e => setEditItem({ ...editItem, Category: e.target.value })}
                  className="w-full h-9 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 text-gray-800 dark:text-gray-200">
                  <option value="">— Select category —</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Default Sets</label>
                  <Input type="number" min={1} value={editItem.DefaultSets}
                    onChange={e => setEditItem({ ...editItem, DefaultSets: parseInt(e.target.value)||1 })}
                    className="h-8 text-sm text-center" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Default Reps</label>
                  <Input type="number" min={1} value={editItem.DefaultReps}
                    onChange={e => setEditItem({ ...editItem, DefaultReps: parseInt(e.target.value)||1 })}
                    className="h-8 text-sm text-center" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Weight</label>
                  <Input type="number" min={0} placeholder="—" value={editItem.DefaultWeight ?? ""}
                    onChange={e => setEditItem({ ...editItem, DefaultWeight: parseFloat(e.target.value)||undefined })}
                    className="h-8 text-sm text-center" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Unit</label>
                  <select value={editItem.WeightUnit ?? "kg"}
                    onChange={e => setEditItem({ ...editItem, WeightUnit: e.target.value as any })}
                    className="w-full h-8 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 text-gray-800 dark:text-gray-200">
                    {WEIGHT_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Rest (sec)</label>
                  <Input type="number" min={0} placeholder="Optional" value={editItem.RestSeconds ?? ""}
                    onChange={e => setEditItem({ ...editItem, RestSeconds: parseInt(e.target.value)||undefined })}
                    className="h-8 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Video URL</label>
                <Input placeholder="https://…" value={editItem.VideoUrl ?? ""}
                  onChange={e => setEditItem({ ...editItem, VideoUrl: e.target.value || undefined })}
                  className="h-8 text-sm" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white border-0">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Log Viewer Dialog ─────────────────────────────────────────────

function LogViewerDialog({ open, workout, logs, setLogs, onClose }: {
  open: boolean; workout: IWorkout|null; logs: IExerciseLog[]; setLogs: ISetLog[]; onClose: ()=>void;
}) {
  if (!workout) return null;
  const merged = mergeWorkoutWithLogs(workout, logs);
  const hasAnyLog = setLogs.length > 0 || logs.some(l => l.IsCompleted === 1);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" />
            {workout.WorkoutName}
          </DialogTitle>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{moment(workout.ScheduledDate,"DD-MM-YYYY").format("ddd, D MMM YYYY")}</span>
            <Badge className={`text-xs h-5 border-0 ${
              merged.completionPercent === 100
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            }`}>{merged.completionPercent}%</Badge>
          </div>
          <Progress value={merged.completionPercent} className="h-1.5 mt-2" />
        </DialogHeader>
        <div className="px-5 py-4 space-y-2">
          {!hasAnyLog && (
            <p className="text-center text-sm text-gray-400 py-4">Client hasn't logged this workout yet.</p>
          )}
          {merged.exercisesWithLogs.map((ex, i) => {
            const exSetLogs = setLogs.filter(s => s.IdExercise === ex.IdExercise);
            const isLogged = exSetLogs.length > 0 || ex.isCompleted;
            return (
              <div key={i} className={`rounded-xl p-3 border ${isLogged
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isLogged ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600"}`}>
                    {isLogged && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{ex.ExerciseName}</span>
                  {ex.VideoUrl && (
                    <a href={ex.VideoUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500">
                      <Video className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-400 ml-7 mt-1">
                  Target: {ex.Sets}×{ex.TargetReps}{ex.TargetWeight ? ` @ ${ex.TargetWeight}${ex.WeightUnit ?? "kg"}` : ""}
                </p>
                {/* Per-set breakdown */}
                {exSetLogs.length > 0 && (
                  <div className="ml-7 mt-2 space-y-1">
                    {exSetLogs.map((s, si) => (
                      <div key={si} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 w-10">Set {s.SetNumber}</span>
                        <span className="font-medium text-green-700 dark:text-green-300">
                          {s.RepsCompleted} reps{s.WeightUsed ? ` @ ${s.WeightUsed}${s.WeightUnit ?? "kg"}` : ""}
                        </span>
                        {s.Notes && <span className="text-gray-400 italic truncate">— {s.Notes}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {ex.logNotes && <p className="text-xs text-gray-400 ml-7 mt-1 italic">"{ex.logNotes}"</p>}
              </div>
            );
          })}
          {merged.totalCount === 0 && <p className="text-center text-sm text-gray-400 py-6">No exercises in this workout.</p>}
        </div>
        <DialogFooter className="px-5 pb-5">
          <Button onClick={onClose} variant="outline" className="w-full">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Workout Card ──────────────────────────────────────────────────

function WorkoutCard({ workout, logs, onEdit, onDelete, onReschedule, onViewLog }: {
  workout: IWorkout; logs: IExerciseLog[];
  onEdit: (w: IWorkout) => void; onDelete: (w: IWorkout) => void;
  onReschedule: (w: IWorkout) => void; onViewLog: (w: IWorkout) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const merged = mergeWorkoutWithLogs(workout, logs);

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
                {workout.Exercises.length} exercise{workout.Exercises.length !== 1 ? "s" : ""}
                {merged.completedCount > 0 && <span className="text-green-600 dark:text-green-400"> · {merged.completedCount} done</span>}
              </p>
            </div>
          </div>
          <span className={`text-sm font-bold flex-shrink-0 ${
            merged.completionPercent === 100 ? "text-green-600 dark:text-green-400"
            : merged.completionPercent > 0 ? "text-orange-600 dark:text-orange-400"
            : "text-gray-300 dark:text-gray-600"
          }`}>{merged.completionPercent}%</span>
        </div>
        {merged.totalCount > 0 && <Progress value={merged.completionPercent} className="h-1.5 mt-2" />}
      </div>

      <div className="grid grid-cols-3 border-t border-gray-100 dark:border-gray-700">
        {[
          { icon: <Eye className="h-3.5 w-3.5" />, label: "Logs",    action: () => onViewLog(workout),      color: "text-blue-600 dark:text-blue-400" },
          { icon: <Pencil className="h-3.5 w-3.5" />, label: "Edit", action: () => onEdit(workout),         color: "text-gray-600 dark:text-gray-300" },
          { icon: <ArrowRightLeft className="h-3.5 w-3.5" />, label: "Move", action: () => onReschedule(workout), color: "text-amber-600 dark:text-amber-400" },
        ].map(({ icon, label, action, color }) => (
          <button key={label} onClick={action}
            className={`flex items-center justify-center gap-1.5 py-2.5 border-r border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${color}`}>
            {icon}
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
          </button>
        ))}
      </div>

      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2 border-t border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        <span className="text-[11px] text-gray-400">{expanded ? "Hide" : "Show"} exercises</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {workout.Exercises.map((ex, i) => {
            const exLog = logs.find(l => l.IdExercise === ex.IdExercise);
            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${exLog?.IsCompleted ? "bg-green-50/50 dark:bg-green-950/10" : ""}`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${exLog?.IsCompleted ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{ex.ExerciseName}</span>
                <span className="text-[11px] flex-shrink-0">
                  {exLog?.IsCompleted
                    ? <><span className="text-green-600 dark:text-green-400">{exLog.RepsCompleted}r</span>{exLog.WeightUsed ? <span className="text-orange-500 dark:text-orange-400"> {exLog.WeightUsed}kg</span> : null}</>
                    : <span className="text-gray-400">{ex.Sets}×{ex.TargetReps}{ex.TargetWeight ? ` @ ${ex.TargetWeight}kg` : ""}</span>}
                </span>
                {ex.VideoUrl && (
                  <a href={ex.VideoUrl} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500 flex-shrink-0">
                    <Video className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {workout.Notes && (
        <div className="px-4 py-2 border-t border-gray-50 dark:border-gray-700/50 flex items-start gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-400 italic">{workout.Notes}</p>
        </div>
      )}

      <button onClick={() => onDelete(workout)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 border-t border-gray-100 dark:border-gray-700 transition-colors">
        <Trash2 className="h-3 w-3" /> Delete workout
      </button>
    </Card>
  );
}

// ── Reschedule Dialog ─────────────────────────────────────────────

function RescheduleDialog({ open, workout, saving, onClose, onConfirm }: {
  open: boolean; workout: IWorkout|null; saving: boolean;
  onClose: () => void; onConfirm: (id: number, d: string) => void;
}) {
  const [newDate, setNewDate] = useState("");
  useEffect(() => { if (open) setNewDate(""); }, [open]);
  if (!workout) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-amber-500" /> Reschedule Workout
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{workout.WorkoutName}</p>
            <p className="text-xs text-gray-400 mt-0.5">Currently: {moment(workout.ScheduledDate,"DD-MM-YYYY").format("ddd, D MMM YYYY")}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">New Date *</label>
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => { if (!newDate) { toast.error("Select a date"); return; } onConfirm(workout.IdWorkout!, dateInputToFmt(newDate)); }}
            disabled={saving || !newDate} className="bg-amber-500 hover:bg-amber-600 text-white border-0">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Moving…</> : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Manage Workout Types Dialog ───────────────────────────────────

const TYPES_STORAGE_KEY = 'fitwithpk_workout_types';

function loadStoredTypes(): string[] {
  try {
    const v = localStorage.getItem(TYPES_STORAGE_KEY);
    return v ? JSON.parse(v) : [...WORKOUT_TYPES];
  } catch {
    return [...WORKOUT_TYPES];
  }
}

function saveStoredTypes(types: string[]) {
  localStorage.setItem(TYPES_STORAGE_KEY, JSON.stringify(types));
}

function ManageTypesDialog({ open, types, onClose, onChange }: {
  open: boolean; types: string[];
  onClose: () => void; onChange: (types: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>([]);
  const [newType, setNewType] = useState('');

  useEffect(() => { if (open) setDraft([...types]); }, [open]);

  const remove = (i: number) => setDraft(d => d.filter((_, idx) => idx !== i));
  const add = () => {
    const v = newType.trim();
    if (!v || draft.includes(v)) return;
    setDraft(d => [...d, v]);
    setNewType('');
  };
  const reset = () => setDraft([...WORKOUT_TYPES]);

  const handleSave = () => {
    if (draft.length === 0) { toast.error('Keep at least one type'); return; }
    saveStoredTypes(draft);
    onChange(draft);
    onClose();
    toast.success('Workout types updated');
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-blue-500" /> Manage Workout Types
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-1">
          <div className="space-y-1.5">
            {draft.map((type, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${(TYPE_COLORS[type] ?? 'bg-blue-500').split(' ')[0]}`} />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{type}</span>
                </div>
                <button onClick={() => remove(i)}
                  className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Input placeholder="Add new type…" value={newType}
              onChange={e => setNewType(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add(); }}
              className="flex-1 h-9 text-sm" />
            <button onClick={add} disabled={!newType.trim()}
              className="px-3 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-40 transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button onClick={reset}
            className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline underline-offset-2 py-1 transition-colors">
            Reset to defaults
          </button>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white border-0">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Template Editor Drawer ────────────────────────────────────────

const TEMPLATE_CATEGORIES = [
  'Upper Body', 'Lower Body', 'Push', 'Pull', 'Legs',
  'Full Body', 'Cardio', 'Mobility', 'Flexibility', 'Other',
];

function TemplateEditorDrawer({ open, initial, saving, library, onClose, onSave }: {
  open: boolean; initial: IWorkoutTemplate | null; saving: boolean;
  library: IExerciseLibraryItem[];
  onClose: () => void; onSave: (t: IWorkoutTemplate) => void;
}) {
  const [tpl, setTpl] = useState<IWorkoutTemplate | null>(null);
  useEffect(() => { if (open && initial) setTpl(JSON.parse(JSON.stringify(initial))); }, [open, initial]);
  if (!tpl) return null;

  const setField = (f: keyof IWorkoutTemplate, v: string) => setTpl(t => t ? { ...t, [f]: v } : t);

  // Convert ITemplateExercise ↔ IExercise for reuse of ExerciseEditorRow
  const exAsIExercise = (ex: ITemplateExercise): IExercise => ({
    IdExercise: ex.IdTemplateExercise,
    ExerciseName: ex.ExerciseName,
    VideoUrl: ex.VideoUrl,
    Sets: ex.Sets,
    TargetReps: ex.TargetReps,
    TargetWeight: ex.TargetWeight,
    WeightUnit: ex.WeightUnit,
    RestSeconds: ex.RestSeconds,
    Notes: ex.Notes,
    SortOrder: ex.SortOrder,
  });

  const addEx = () => setTpl(t => t ? { ...t, Exercises: [...t.Exercises, createBlankTemplateExercise(t.Exercises.length)] } : t);
  const removeEx = (i: number) => setTpl(t => t ? { ...t, Exercises: t.Exercises.filter((_, idx) => idx !== i) } : t);
  const changeEx = (i: number, f: keyof IExercise, v: string | number) =>
    setTpl(t => { if (!t) return t; const exs = [...t.Exercises]; exs[i] = { ...exs[i], [f]: v }; return { ...t, Exercises: exs }; });

  const handleSave = () => {
    if (!tpl.TemplateName.trim()) { toast.error("Template name required"); return; }
    if (tpl.Exercises.length === 0) { toast.error("Add at least one exercise"); return; }
    for (const ex of tpl.Exercises) if (!ex.ExerciseName.trim()) { toast.error("All exercises need a name"); return; }
    onSave(tpl);
  };

  return (
    <Drawer open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DrawerContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-h-[90vh]">
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {tpl.IdTemplate ? "Edit Template" : "New Template"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 space-y-3 pb-6">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Template Name *</label>
            <Input placeholder="e.g. Upper Body A" value={tpl.TemplateName} onChange={e => setField("TemplateName", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Category</label>
            <select value={tpl.Category ?? ""}
              onChange={e => setField("Category", e.target.value)}
              className="w-full h-9 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 text-gray-800 dark:text-gray-200">
              <option value="">— Select category —</option>
              {TEMPLATE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Notes</label>
            <Input placeholder="Optional notes for this template..." value={tpl.Notes ?? ""} onChange={e => setField("Notes", e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Exercises <span className="text-gray-400">({tpl.Exercises.length})</span>
              </label>
              <button onClick={addEx}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full transition-colors">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {tpl.Exercises.length === 0 ? (
                <button onClick={addEx}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-400 hover:border-blue-300 hover:text-blue-500 flex flex-col items-center gap-2 transition-colors">
                  <Plus className="h-6 w-6" />
                  <span className="text-sm">Add your first exercise</span>
                </button>
              ) : tpl.Exercises.map((ex, i) => (
                <ExerciseEditorRow key={i} ex={exAsIExercise(ex)} index={i} library={library} onChange={changeEx} onRemove={removeEx} />
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Check className="h-4 w-4" strokeWidth={3} /> Save Template</>}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── Template Manager ──────────────────────────────────────────────

function TemplateManager({ templates, library, onRefresh }: {
  templates: IWorkoutTemplate[];
  library: IExerciseLibraryItem[];
  onRefresh: () => void;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<IWorkoutTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const createMut = useMutation({
    mutationFn: createWorkoutTemplate,
    onSuccess: () => { toast.success("Template created"); onRefresh(); setEditorOpen(false); },
    onError: () => toast.error("Failed to create"),
  });
  const updateMut = useMutation({
    mutationFn: updateWorkoutTemplate,
    onSuccess: () => { toast.success("Template updated"); onRefresh(); setEditorOpen(false); },
    onError: () => toast.error("Failed to update"),
  });
  const deleteMut = useMutation({
    mutationFn: deleteWorkoutTemplate,
    onSuccess: () => { toast.success("Deleted"); onRefresh(); },
    onError: () => toast.error("Failed to delete"),
  });

  const saving = createMut.isPending || updateMut.isPending;

  const grouped: Record<string, IWorkoutTemplate[]> = {};
  templates.forEach(t => {
    const cat = t.Category || 'Uncategorised';
    (grouped[cat] = grouped[cat] ?? []).push(t);
  });

  return (
    <>
      <div className="space-y-3">
        <button
          onClick={() => { setEditing(createBlankTemplate()); setEditorOpen(true); }}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> New Template
        </button>

        {templates.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <LayoutGrid className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-semibold text-gray-500">No templates yet</p>
            <p className="text-xs text-gray-400 mt-1">Create reusable workout templates to quickly assign to clients.</p>
          </div>
        ) : Object.entries(grouped).map(([cat, tpls]) => (
          <div key={cat}>
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5 px-1">{cat}</p>
            <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 overflow-hidden">
              {tpls.map(tpl => (
                <div key={tpl.IdTemplate} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      TYPE_COLORS[tpl.Category ?? '']
                        ? (TYPE_COLORS[tpl.Category ?? ''].split(' ')[0]) + ' bg-opacity-20'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <Dumbbell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{tpl.TemplateName}</p>
                      <p className="text-[11px] text-gray-400">{tpl.Exercises.length} exercise{tpl.Exercises.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={() => setExpandedId(expandedId === tpl.IdTemplate ? null : tpl.IdTemplate ?? null)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                      {expandedId === tpl.IdTemplate ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button onClick={() => { setEditing({ ...tpl }); setEditorOpen(true); }}
                      className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { if (!confirm(`Delete "${tpl.TemplateName}"?`)) return; deleteMut.mutate({ IdTemplate: tpl.IdTemplate! }); }}
                      className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {expandedId === tpl.IdTemplate && tpl.Exercises.length > 0 && (
                    <div className="border-t border-gray-50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-700/20">
                      {tpl.Exercises.map((ex, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                          <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">{ex.ExerciseName}</span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {ex.Sets}×{ex.TargetReps}{ex.TargetWeight ? ` @ ${ex.TargetWeight}${ex.WeightUnit ?? 'kg'}` : ''}
                          </span>
                          {ex.VideoUrl && (
                            <a href={ex.VideoUrl} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500">
                              <Video className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          </div>
        ))}
      </div>

      <TemplateEditorDrawer
        open={editorOpen}
        initial={editing}
        saving={saving}
        library={library}
        onClose={() => setEditorOpen(false)}
        onSave={t => t.IdTemplate ? updateMut.mutate(t) : createMut.mutate(t)}
      />
    </>
  );
}

// ── Day Assign Drawer ─────────────────────────────────────────────

function DayAssignDrawer({ open, date, existingWorkouts, saving, templates, onClose, onAddFromTemplate, onRemove }: {
  open: boolean; date: string; existingWorkouts: IWorkout[];
  saving: boolean; templates: IWorkoutTemplate[]; onClose: () => void;
  onAddFromTemplate: (template: IWorkoutTemplate) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DrawerContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {moment(date, 'DD-MM-YYYY').format('ddd, D MMM')}
            </h2>
            {existingWorkouts.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{existingWorkouts.length} assigned</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8 space-y-4">
          {/* Assigned workouts */}
          {existingWorkouts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Assigned — tap Remove to change</p>
              {existingWorkouts.map(w => (
                <div key={w.IdWorkout}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${(TYPE_COLORS[w.WorkoutName] ?? 'bg-blue-500').split(' ')[0]}`} />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{w.WorkoutName}</span>
                  </div>
                  <button onClick={() => onRemove(w.IdWorkout!)} disabled={saving}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              ))}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-2" />
            </div>
          )}

          {/* Templates as colored grid */}
          {templates.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                {existingWorkouts.length > 0 ? 'Add another workout' : 'Select Workout'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {templates.map(tpl => (
                  <button key={tpl.IdTemplate} disabled={saving}
                    onClick={() => { onAddFromTemplate(tpl); onClose(); }}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold text-center transition-all active:scale-95 hover:opacity-90 ${
                      TYPE_COLORS[tpl.Category ?? ''] ?? TYPE_COLORS[tpl.TemplateName] ?? 'bg-blue-500 text-white'
                    } ${existingWorkouts.some(w => w.WorkoutName === tpl.TemplateName) ? 'opacity-40' : ''}`}>
                    {tpl.TemplateName}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <LayoutGrid className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No templates yet</p>
              <p className="text-xs text-gray-400 mt-1">Go to the Templates tab to create reusable workout templates.</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── Copy Week Dialog ──────────────────────────────────────────────

const COPY_WEEK_OPTIONS = [1, 2, 4, 8, 12];

function CopyWeekDialog({ open, weekStart, dayWorkouts, selectedClient, onClose, onDone }: {
  open: boolean; weekStart: string; dayWorkouts: IWorkout[][];
  selectedClient: number; onClose: () => void; onDone: () => void;
}) {
  const [weeks, setWeeks] = useState(4);
  const [copying, setCopying] = useState(false);

  const totalWorkouts = dayWorkouts.flat().filter(w => w.WorkoutName !== 'Rest Day').length;

  const handleCopy = async () => {
    const assignments: { dayOffset: number; name: string }[] = [];
    dayWorkouts.forEach((dws, i) => {
      dws.filter(w => w.WorkoutName !== 'Rest Day').forEach(w => {
        assignments.push({ dayOffset: i, name: w.WorkoutName });
      });
    });
    if (assignments.length === 0) { toast.error('No workouts to copy'); return; }

    setCopying(true);
    try {
      const toCreate: IWorkout[] = [];
      for (let w = 1; w <= weeks; w++) {
        const weekMon = moment(weekStart, 'DD-MM-YYYY').add(w * 7, 'days');
        assignments.forEach(({ dayOffset, name }) => {
          toCreate.push({
            WorkoutName: name,
            IdUser: selectedClient,
            ScheduledDate: ddmmyyyy(weekMon.clone().add(dayOffset, 'days')),
            Status: 'Planned',
            Exercises: [],
          });
        });
      }
      await bulkCreateWorkouts({ Workouts: toCreate });
      toast.success(`Copied ${assignments.length} workout${assignments.length !== 1 ? 's' : ''} × ${weeks} week${weeks > 1 ? 's' : ''}`);
      onDone();
      onClose();
    } catch {
      toast.error('Failed to copy workouts');
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-blue-500" /> Copy Weekly Plan
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Week of {moment(weekStart, 'DD-MM-YYYY').format('D MMM YYYY')}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''} assigned this week
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Repeat for</p>
            <div className="flex flex-wrap gap-2">
              {COPY_WEEK_OPTIONS.map(n => (
                <button key={n} onClick={() => setWeeks(n)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    weeks === n
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  {n} week{n > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={copying}>Cancel</Button>
          <Button onClick={handleCopy} disabled={copying || totalWorkouts === 0} className="bg-blue-600 hover:bg-blue-700 text-white border-0">
            {copying
              ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Copying…</>
              : `Copy ${weeks} week${weeks > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Weekly Planner Tab ────────────────────────────────────────────

const DAY_LABELS_PLANNER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeeklyPlannerTab({ selectedClient, library }: {
  selectedClient: number | null;
  library: IExerciseLibraryItem[];
}) {
  const [plannerWeek, setPlannerWeek] = useState(ddmmyyyy(moment().startOf('isoWeek')));
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDate, setAssignDate] = useState('');
  const [copyOpen, setCopyOpen] = useState(false);

  const weekDays = buildWeek(plannerWeek);
  const weekLabel = `${moment(weekDays[0], 'DD-MM-YYYY').format('D MMM')} – ${moment(weekDays[6], 'DD-MM-YYYY').format('D MMM YYYY')}`;
  const shiftWeek = (dir: -1 | 1) => setPlannerWeek(ddmmyyyy(moment(plannerWeek, 'DD-MM-YYYY').add(dir * 7, 'days')));

  const weekQueries = useQueries({
    queries: weekDays.map(date => ({
      queryKey: ['workouts', selectedClient, date],
      queryFn: () => getWorkoutsForClient({ IdUser: selectedClient!, ScheduledDate: date }),
      enabled: !!selectedClient,
      staleTime: 30_000,
    })),
  });

  const { data: templatesRes, refetch: refetchTemplates } = useQuery({
    queryKey: ['workout-templates'],
    queryFn: () => getWorkoutTemplates(),
    staleTime: 300_000,
  });
  const templates: IWorkoutTemplate[] = (templatesRes as any)?.data?.data ?? [];

  const dayWorkouts: IWorkout[][] = weekQueries.map(q => (q.data as any)?.data?.data ?? []);
  const isLoadingWeek = weekQueries.some(q => q.isFetching && !q.data);

  const invalidateWeek = () => weekQueries.forEach(q => q.refetch());

  const createMut = useMutation({
    mutationFn: createWorkout,
    onSuccess: () => { toast.success('Assigned!'); invalidateWeek(); },
    onError: () => toast.error('Failed to assign'),
  });
  const deleteMut = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => invalidateWeek(),
    onError: () => toast.error('Failed to remove'),
  });

  const handleAddFromTemplate = (tpl: IWorkoutTemplate) => {
    if (!selectedClient || !assignDate) return;
    createMut.mutate({
      WorkoutName: tpl.TemplateName,
      IdUser: selectedClient,
      ScheduledDate: assignDate,
      Status: 'Planned',
      Exercises: tpl.Exercises.map((ex, i) => ({
        ExerciseName: ex.ExerciseName,
        VideoUrl: ex.VideoUrl,
        Sets: ex.Sets,
        TargetReps: ex.TargetReps,
        TargetWeight: ex.TargetWeight,
        WeightUnit: ex.WeightUnit,
        RestSeconds: ex.RestSeconds,
        Notes: ex.Notes,
        SortOrder: i,
      })),
    });
  };

  // Keep refetchTemplates available (used to refresh template data if needed)
  void refetchTemplates;

  const assignDayIdx = weekDays.indexOf(assignDate);
  const assignDayWorkouts = assignDayIdx >= 0 ? dayWorkouts[assignDayIdx] : [];

  if (!selectedClient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
          <User className="h-7 w-7 text-gray-400 dark:text-gray-600" />
        </div>
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Select a client</p>
        <p className="text-xs text-gray-400 mt-1">Choose a client above to plan their weekly schedule.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-700">
        <button onClick={() => shiftWeek(-1)} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{weekLabel}</span>
        <button onClick={() => shiftWeek(1)} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoadingWeek ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : weekDays.map((date, i) => {
          const dws = dayWorkouts[i];
          const isWeekend = i >= 5;
          const todayDay = isToday(date);

          return (
            <div key={date} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${
              todayDay ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
            }`}>
              <div className="w-12 flex-shrink-0">
                <p className={`text-xs font-bold ${isWeekend ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {DAY_LABELS_PLANNER[i]}
                </p>
                <p className={`text-[11px] ${todayDay ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-400'}`}>
                  {moment(date, 'DD-MM-YYYY').format('D MMM')}
                </p>
              </div>

              <button
                className="flex-1 flex flex-wrap gap-1.5 min-w-0 text-left"
                onClick={() => { setAssignDate(date); setAssignOpen(true); }}>
                {dws.length > 0 ? (
                  dws.map(w => (
                    <span key={w.IdWorkout}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        TYPE_COLORS[w.WorkoutName] ?? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                      {w.WorkoutName}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-600 italic">Tap to assign</span>
                )}
              </button>

              <button
                onClick={() => { setAssignDate(date); setAssignOpen(true); }}
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </Card>

      <button
        onClick={() => setCopyOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-400 transition-colors">
        <Copy className="h-4 w-4" /> Copy to Future Weeks
      </button>

      <DayAssignDrawer
        open={assignOpen}
        date={assignDate}
        existingWorkouts={assignDayWorkouts}
        saving={createMut.isPending}
        templates={templates}
        onClose={() => setAssignOpen(false)}
        onAddFromTemplate={handleAddFromTemplate}
        onRemove={id => deleteMut.mutate({ IdWorkout: id })}
      />
      {copyOpen && (
        <CopyWeekDialog
          open={copyOpen}
          weekStart={plannerWeek}
          dayWorkouts={dayWorkouts}
          selectedClient={selectedClient}
          onClose={() => setCopyOpen(false)}
          onDone={invalidateWeek}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function AdminWorkoutPlanPage() {
  useEffect(() => { setBaseUrl(BASE_URL); }, []);

  const [pageTab, setPageTab]               = useState<"workouts"|"templates"|"library"|"weekly"|"progress">("workouts");
  const [selectedClient, setSelectedClient] = useState<number|null>(null);
  const [selectedDate, setSelectedDate]     = useState(ddmmyyyy(moment()));
  const [editorOpen, setEditorOpen]         = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<IWorkout|null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reschedulingWorkout, setReschedulingWorkout] = useState<IWorkout|null>(null);
  const [logViewerOpen, setLogViewerOpen]   = useState(false);
  const [viewingWorkout, setViewingWorkout] = useState<IWorkout|null>(null);
  const [logsForViewer, setLogsForViewer]   = useState<IExerciseLog[]>([]);

  // ── Queries ────────────────────────────────────────────────────

  const { data: clientsRes, isLoading: clientsLoading } = useQuery({
    queryKey: ["users-for-coach-workout"],
    queryFn: () => getUserListForACoach({}),
    staleTime: Infinity,
  });
  const clients: IUser[] = clientsRes?.data?.data ?? [];

  const { data: libraryRes, refetch: refetchLibrary } = useQuery({
    queryKey: ["exercise-library"],
    queryFn: () => getExerciseLibrary(),
    staleTime: 300_000,
  });
  const library: IExerciseLibraryItem[] = libraryRes?.data?.data ?? [];

  const { data: templatesRes, refetch: refetchTemplates } = useQuery({
    queryKey: ["workout-templates"],
    queryFn: () => getWorkoutTemplates(),
    staleTime: 300_000,
  });
  const templates: IWorkoutTemplate[] = (templatesRes as any)?.data?.data ?? [];

  const { data: workoutsRes, isLoading: workoutsLoading, isError } = useQuery({
    queryKey: ["workouts", selectedClient, selectedDate],
    queryFn: () => getWorkoutsForClient({ IdUser: selectedClient!, ScheduledDate: selectedDate }),
    enabled: !!selectedClient,
    staleTime: 30_000,
  });
  const workouts: IWorkout[] = Array.isArray(workoutsRes?.data?.data) ? workoutsRes.data.data : [];

  const { data: logsRes } = useQuery({
    queryKey: ["workout-logs-admin", selectedClient, selectedDate],
    queryFn: () => getWorkoutLogsForClient({ IdUser: selectedClient!, LogDate: selectedDate }),
    enabled: !!selectedClient,
    staleTime: 30_000,
  });
  const allLogs: IExerciseLog[] = logsRes?.data?.data ?? [];

  const { data: setLogsRes } = useQuery({
    queryKey: ["workout-set-logs-admin", selectedClient, selectedDate],
    queryFn: () => getClientSetLogs({ IdUser: selectedClient!, LogDate: selectedDate }),
    enabled: !!selectedClient,
    staleTime: 30_000,
  });
  const allSetLogs: ISetLog[] = setLogsRes?.data?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────────

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["workouts", selectedClient] });
    queryClient.invalidateQueries({ queryKey: ["workout-logs-admin", selectedClient] });
    queryClient.invalidateQueries({ queryKey: ["workout-set-logs-admin", selectedClient] });
  };

  const createMut     = useMutation({ mutationFn: createWorkout,     onSuccess: () => { toast.success("Workout created!"); invalidate(); setEditorOpen(false); }, onError: () => toast.error("Failed to create") });
  const updateMut     = useMutation({ mutationFn: updateWorkout,     onSuccess: () => { toast.success("Updated!");          invalidate(); setEditorOpen(false); }, onError: () => toast.error("Failed to update") });
  const deleteMut     = useMutation({ mutationFn: deleteWorkout,     onSuccess: () => { toast.success("Deleted");           invalidate(); },                      onError: () => toast.error("Failed to delete") });
  const rescheduleMut = useMutation({ mutationFn: rescheduleWorkout, onSuccess: () => { toast.success("Rescheduled!");      invalidate(); setRescheduleOpen(false); }, onError: () => toast.error("Failed to reschedule") });

  const handleSave    = (w: IWorkout) => w.IdWorkout ? updateMut.mutate(w) : createMut.mutate(w);
  const handleDelete  = (w: IWorkout) => { if (!confirm(`Delete "${w.WorkoutName}"?`)) return; deleteMut.mutate({ IdWorkout: w.IdWorkout! }); };
  const handleViewLog = (w: IWorkout) => {
    setLogsForViewer(allLogs.filter(l => l.IdWorkout === w.IdWorkout));
    setViewingWorkout(w);
    setLogViewerOpen(true);
  };

  const saving  = createMut.isPending || updateMut.isPending;
  const totalEx = workouts.reduce((s,w) => s + w.Exercises.length, 0);
  const doneEx  = allLogs.filter(l => l.IsCompleted === 1).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-blue-600 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-white" />
            <span className="text-lg font-bold text-white">Workout Planner</span>
          </div>
          {pageTab === "workouts" && (
            <button
              onClick={() => {
                if (!selectedClient) { toast.error("Select a client first"); return; }
                setEditingWorkout(createBlankWorkout(selectedClient, selectedDate));
                setEditorOpen(true);
              }}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-sm px-3 py-1.5 rounded-full transition-colors">
              <Plus className="h-4 w-4" /> New
            </button>
          )}
        </div>

        {/* Show client picker on workouts and weekly tabs */}
        {pageTab !== "library" && pageTab !== "templates" && (
          <div className="mt-3">
            {clientsLoading ? (
              <div className="h-10 bg-white/20 rounded-xl animate-pulse" />
            ) : (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-200" />
                <select value={selectedClient ?? ""} onChange={e => setSelectedClient(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-10 text-sm bg-white/15 border border-white/20 rounded-xl pl-9 pr-3 text-white appearance-none focus:outline-none focus:ring-1 focus:ring-white/40">
                  <option value="" className="bg-blue-700 text-white">Select a client…</option>
                  {clients.map(c => (
                    <option key={c.IdUser} value={c.IdUser} className="bg-blue-700 text-white">
                      {c.FirstName} {c.LastName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Date nav + week strip only for workouts tab */}
        {pageTab === "workouts" && (
          <>
            <div className="flex items-center justify-between mt-2">
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
          </>
        )}
      </div>

      {/* ── Page Tabs ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => setPageTab("workouts")}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            pageTab === "workouts"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}>
          <Dumbbell className="h-3.5 w-3.5" /> Workouts
        </button>
        <button onClick={() => setPageTab("templates")}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            pageTab === "templates"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}>
          <LayoutGrid className="h-3.5 w-3.5" /> Templates
          {templates.length > 0 && (
            <span className="ml-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold">{templates.length}</span>
          )}
        </button>
        <button onClick={() => setPageTab("library")}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            pageTab === "library"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}>
          <BookOpen className="h-3.5 w-3.5" /> Library
          {library.length > 0 && (
            <span className="ml-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold">{library.length}</span>
          )}
        </button>
        <button onClick={() => setPageTab("weekly")}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            pageTab === "weekly"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}>
          <CalendarDays className="h-3.5 w-3.5" /> Weekly
        </button>
        <button onClick={() => setPageTab("progress")}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            pageTab === "progress"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}>
          <BarChart2 className="h-3.5 w-3.5" /> Progress
        </button>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28 bg-gray-50 dark:bg-gray-950 space-y-3">

        {/* ── Templates Tab ────────────────────────────────────── */}
        {pageTab === "templates" && (
          <TemplateManager templates={templates} library={library} onRefresh={() => refetchTemplates()} />
        )}

        {/* ── Library Tab ──────────────────────────────────────── */}
        {pageTab === "library" && (
          <LibraryManager library={library} onRefresh={() => refetchLibrary()} />
        )}

        {/* ── Weekly Plan Tab ───────────────────────────────────── */}
        {pageTab === "weekly" && (
          <WeeklyPlannerTab selectedClient={selectedClient} library={library} />
        )}

        {/* ── Progress Tab ─────────────────────────────────────── */}
        {pageTab === "progress" && (
          selectedClient ? (
            <WorkoutProgressCharts idUser={selectedClient} isAdmin />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <BarChart2 className="h-7 w-7 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Select a client</p>
              <p className="text-xs text-gray-400 mt-1">Choose a client to view their progress charts.</p>
            </div>
          )
        )}

        {/* ── Workouts Tab ─────────────────────────────────────── */}
        {pageTab === "workouts" && (
          <>
            {!selectedClient && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <User className="h-7 w-7 text-gray-400 dark:text-gray-600" />
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Select a client</p>
                <p className="text-xs text-gray-400 mt-1">Choose a client to view or plan their workouts.</p>
              </div>
            )}

            {selectedClient && workoutsLoading && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              </div>
            )}

            {selectedClient && isError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" /> Failed to load workouts.
              </div>
            )}

            {selectedClient && !workoutsLoading && workouts.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Workouts",  value: workouts.length, color: "text-blue-600 dark:text-blue-400" },
                  { label: "Exercises", value: totalEx,         color: "text-gray-700 dark:text-gray-200" },
                  { label: "Done",      value: doneEx,          color: doneEx > 0 ? "text-green-600 dark:text-green-400" : "text-gray-300 dark:text-gray-600" },
                ].map(({ label, value, color }) => (
                  <Card key={label} className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
                    <CardContent className="px-3 py-2 text-center">
                      <p className={`text-lg font-bold ${color}`}>{value}</p>
                      <p className="text-[10px] text-gray-400">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedClient && !workoutsLoading && !isError && workouts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <Dumbbell className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No workouts for this date</p>
                <button onClick={() => { setEditingWorkout(createBlankWorkout(selectedClient!, selectedDate)); setEditorOpen(true); }}
                  className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  <Plus className="h-4 w-4" /> Create workout
                </button>
              </div>
            )}

            {!workoutsLoading && workouts.map(w => (
              <WorkoutCard key={w.IdWorkout ?? w.WorkoutName} workout={w}
                logs={allLogs.filter(l => l.IdWorkout === w.IdWorkout)}
                onEdit={w => { setEditingWorkout(w); setEditorOpen(true); }}
                onDelete={handleDelete}
                onReschedule={w => { setReschedulingWorkout(w); setRescheduleOpen(true); }}
                onViewLog={handleViewLog}
              />
            ))}
          </>
        )}
      </main>

      <MobileAdminNav />

      <WorkoutEditorDrawer open={editorOpen} initial={editingWorkout} saving={saving}
        library={library}
        onClose={() => setEditorOpen(false)} onSave={handleSave} />
      <RescheduleDialog open={rescheduleOpen} workout={reschedulingWorkout} saving={rescheduleMut.isPending}
        onClose={() => setRescheduleOpen(false)}
        onConfirm={(id, d) => rescheduleMut.mutate({ IdWorkout: id, NewDate: d })} />
      <LogViewerDialog open={logViewerOpen} workout={viewingWorkout} logs={logsForViewer}
        setLogs={viewingWorkout ? allSetLogs.filter(s => s.IdWorkout === viewingWorkout.IdWorkout) : []}
        onClose={() => setLogViewerOpen(false)} />
    </div>
  );
}
