"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Flame, Loader2, Pencil, Plus, Trash2, Trophy, Zap } from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { queryClient } from "../../lib/queryClient";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { getUserListForACoach } from "../../services/AdminServices";
import { IUser } from "../../interface/models/User";
import { HabitIcon } from "../../components/habits/habit-icon";
import { HabitHeatmap } from "../../components/habits/habit-heatmap";
import { HabitTrendBars } from "../../components/habits/habit-trend-bars";
import { BadgeShelf } from "../../components/habits/badge-shelf";
import {
  assignHabits, createLibraryHabit, deleteLibraryHabit, getClientHabitStats,
  getHabitAssignmentsForClient, getHabitLibrary, unassignHabit, updateHabitAssignment,
  updateLibraryHabit,
} from "../../services/HabitService";
import {
  DAYS_OF_WEEK, EVERY_DAY, HABIT_CATEGORIES, HABIT_ICON_CHOICES, HABIT_COLORS,
  IClientHabitStatsResponse, IHabit, IHabitAssignment, LINKED_METRICS, habitColor,
} from "../../interface/IHabit";

const WIRE = "DD-MM-YYYY";
const STATS_DAYS = 90;

type Tab = "library" | "assigned" | "adherence";

const blankHabit = (): IHabit => ({
  Name: "",
  Description: "",
  Icon: "CircleCheck",
  ColorKey: "blue",
  Category: "Lifestyle",
  DefaultTargetCount: 1,
  Unit: "times",
  LinkedMetric: null,
});

export default function AdminHabitPage() {
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("assigned");
  const [editingHabit, setEditingHabit] = useState<IHabit | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<IHabitAssignment | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);

  const { data: clientsRes, isLoading: clientsLoading } = useQuery({
    queryKey: ["users-for-coach-habits"],
    queryFn: () => getUserListForACoach({}),
    staleTime: 60_000,
  });
  const clients: IUser[] = clientsRes?.data?.data ?? [];
  const selectedClientName = useMemo(() => {
    const c = clients.find((x) => x.IdUser === selectedClient);
    return c ? `${c.FirstName} ${c.LastName ?? ""}`.trim() : "";
  }, [clients, selectedClient]);

  const { data: libraryRes, isLoading: libraryLoading } = useQuery({
    queryKey: ["habit-library"],
    queryFn: () => getHabitLibrary(),
  });
  const library: IHabit[] = libraryRes?.data?.data ?? [];

  const { data: assignedRes, isLoading: assignedLoading } = useQuery({
    queryKey: ["habit-assignments", selectedClient],
    queryFn: () => getHabitAssignmentsForClient(selectedClient!),
    enabled: !!selectedClient,
    staleTime: 0,
  });
  const assigned: IHabitAssignment[] = assignedRes?.data?.data ?? [];

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ["habit-client-stats", selectedClient],
    queryFn: () => getClientHabitStats({ IdUser: selectedClient!, days: STATS_DAYS }),
    enabled: !!selectedClient && tab === "adherence",
    staleTime: 0,
  });
  const clientStats: IClientHabitStatsResponse | undefined = statsRes?.data?.data;

  const invalidateClient = () => {
    queryClient.invalidateQueries({ queryKey: ["habit-assignments", selectedClient] });
    queryClient.invalidateQueries({ queryKey: ["habit-client-stats", selectedClient] });
  };

  // ── Mutations. The API returns the refreshed list, but invalidating keeps
  // every dependent query honest without threading the payload around.
  const libraryMut = useMutation({
    mutationFn: (h: IHabit) => (h.IdHabit ? updateLibraryHabit(h) : createLibraryHabit(h)),
    onSuccess: (res) => {
      if (!res.data?.success) return toast.error(res.data?.message ?? "Failed to save");
      toast.success("Library updated");
      queryClient.invalidateQueries({ queryKey: ["habit-library"] });
      setEditingHabit(null);
    },
    onError: () => toast.error("Failed to save habit"),
  });

  const deleteLibraryMut = useMutation({
    mutationFn: deleteLibraryHabit,
    onSuccess: () => {
      toast.success("Removed from library");
      queryClient.invalidateQueries({ queryKey: ["habit-library"] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  const assignMut = useMutation({
    mutationFn: assignHabits,
    onSuccess: (res) => {
      if (!res.data?.success) return toast.error(res.data?.message ?? "Failed to assign");
      toast.success("Habits assigned");
      invalidateClient();
      setPickerOpen(false);
    },
    onError: () => toast.error("Failed to assign habits"),
  });

  const updateAssignmentMut = useMutation({
    mutationFn: updateHabitAssignment,
    onSuccess: (res) => {
      if (!res.data?.success) return toast.error(res.data?.message ?? "Failed to save");
      toast.success("Habit updated");
      invalidateClient();
      setEditingAssignment(null);
    },
    onError: () => toast.error("Failed to update habit"),
  });

  const unassignMut = useMutation({
    mutationFn: unassignHabit,
    onSuccess: () => {
      toast.success("Habit removed");
      invalidateClient();
    },
    onError: () => toast.error("Failed to remove habit"),
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-28 dark:bg-gray-950">
      <header className="bg-gradient-to-r from-blue-700 to-blue-600 px-4 pb-4 pt-6 text-white">
        <h1 className="text-xl font-bold">Habit tracker</h1>
        <p className="mt-0.5 text-sm text-blue-100">Build habits, assign them, watch the streaks</p>

        <select
          value={selectedClient ?? ""}
          onChange={(e) => setSelectedClient(e.target.value ? Number(e.target.value) : null)}
          aria-label="Select a client"
          className="mt-3 w-full rounded-lg border-0 bg-white/20 px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-gray-900"
        >
          <option value="">{clientsLoading ? "Loading clients…" : "Select a client…"}</option>
          {clients.map((c) => (
            <option key={c.IdUser} value={c.IdUser}>
              {c.FirstName} {c.LastName}
            </option>
          ))}
        </select>
      </header>

      <nav className="flex border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" role="tablist">
        {([["assigned", "Assigned"], ["library", "Library"], ["adherence", "Progress"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
              tab === key
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="px-4 py-4">
        {/* ── Library — client-independent, so it renders without a selection ── */}
        {tab === "library" && (
          <div className="space-y-3">
            <Button className="w-full" onClick={() => setEditingHabit(blankHabit())}>
              <Plus className="mr-1.5 h-4 w-4" /> New habit
            </Button>

            {libraryLoading ? (
              <Spinner />
            ) : library.length === 0 ? (
              <Empty text="No habits in the library yet." />
            ) : (
              library.map((h) => {
                const c = habitColor(h.ColorKey);
                return (
                  <div key={h.IdHabit} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${c.bg} ${c.text}`}>
                      <HabitIcon name={h.Icon} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                        <span className="truncate">{h.Name}</span>
                        {!!h.LinkedMetric && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded bg-blue-50 px-1 text-[9px] font-bold uppercase text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                            <Zap className="h-2.5 w-2.5" /> {h.LinkedMetric}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                        {h.Category} · {h.DefaultTargetCount} {h.Unit}
                      </p>
                    </div>
                    <button type="button" aria-label={`Edit ${h.Name}`} onClick={() => setEditingHabit(h)} className="p-1.5 text-gray-400 hover:text-blue-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${h.Name}`}
                      onClick={() => {
                        if (window.confirm(`Remove "${h.Name}" from the library? Existing assignments keep working.`)) {
                          deleteLibraryMut.mutate(h.IdHabit!);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Assigned ── */}
        {tab === "assigned" && (
          !selectedClient ? (
            <Empty text="Select a client to manage their habits." />
          ) : (
            <div className="space-y-3">
              <Button className="w-full" onClick={() => setPickerOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Assign habits to {selectedClientName}
              </Button>

              {assignedLoading ? (
                <Spinner />
              ) : assigned.length === 0 ? (
                <Empty text="No habits assigned yet." />
              ) : (
                assigned.map((a) => {
                  const c = habitColor(a.ColorKey);
                  const everyDay = a.DaysOfWeek === EVERY_DAY;
                  return (
                    <div key={a.IdAssignment} className="rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${c.bg} ${c.text}`}>
                          <HabitIcon name={a.Icon} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{a.Name}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {a.TargetCount} {a.Unit}
                            {!!a.ReminderTime && ` · reminder ${a.ReminderTime}`}
                            {!!a.EndDate && ` · ends ${moment(a.EndDate, WIRE).format("D MMM")}`}
                          </p>
                        </div>
                        <button type="button" aria-label={`Edit ${a.Name}`} onClick={() => setEditingAssignment(a)} className="p-1.5 text-gray-400 hover:text-blue-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${a.Name}`}
                          onClick={() => {
                            if (window.confirm(`Remove "${a.Name}" from ${selectedClientName}? Their history is kept.`)) {
                              unassignMut.mutate(a.IdAssignment!);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2 flex gap-1 pl-12">
                        {DAYS_OF_WEEK.map((d) => {
                          const on = everyDay || a.DaysOfWeek.split(",").includes(d.value);
                          return (
                            <span
                              key={d.value}
                              title={d.label}
                              className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold ${
                                on ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                              }`}
                            >
                              {d.short}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )
        )}

        {/* ── Progress — the same views the student sees ── */}
        {tab === "adherence" && (
          !selectedClient ? (
            <Empty text="Select a client to see their progress." />
          ) : statsLoading ? (
            <Spinner />
          ) : !clientStats ? (
            <Empty text="No habit data for this client yet." />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <MetricTile icon={<Flame className="h-4 w-4 text-orange-500" />} label="Current streak" value={`${clientStats.Stats.CurrentStreak}`} suffix="days" />
                <MetricTile icon={<Trophy className="h-4 w-4 text-amber-500" />} label="Best streak" value={`${clientStats.Stats.BestStreak}`} suffix="days" />
                <MetricTile icon={<Check className="h-4 w-4 text-emerald-500" />} label="Perfect days" value={`${clientStats.Stats.PerfectDays}`} />
                <MetricTile icon={<Zap className="h-4 w-4 text-blue-500" />} label="Last 30 days" value={`${clientStats.Stats.Last30Percent}`} suffix="%" />
              </div>

              <AdminCard title="Last 12 weeks">
                <HabitHeatmap history={clientStats.History} weeks={12} />
              </AdminCard>
              <AdminCard title="Habit by habit">
                <HabitTrendBars trends={clientStats.Trends} days={STATS_DAYS} />
              </AdminCard>
              <AdminCard title="Badges">
                <BadgeShelf earned={clientStats.Badges} locked={[]} />
              </AdminCard>
            </div>
          )
        )}
      </main>

      {editingHabit && (
        <LibraryHabitDialog
          initial={editingHabit}
          saving={libraryMut.isPending}
          onClose={() => setEditingHabit(null)}
          onSave={(h) => libraryMut.mutate(h)}
        />
      )}

      {pickerOpen && selectedClient && (
        <AssignPickerDialog
          library={library}
          alreadyAssigned={assigned.map((a) => a.IdHabit)}
          clientName={selectedClientName}
          saving={assignMut.isPending}
          onClose={() => setPickerOpen(false)}
          onAssign={(habits) => assignMut.mutate({ IdUser: selectedClient, Habits: habits })}
        />
      )}

      {editingAssignment && (
        <AssignmentDialog
          initial={editingAssignment}
          saving={updateAssignmentMut.isPending}
          onClose={() => setEditingAssignment(null)}
          onSave={(a) => updateAssignmentMut.mutate(a)}
        />
      )}

      <MobileAdminNav />
    </div>
  );
}

// ── Small shared pieces ───────────────────────────────────────────

const Spinner = () => (
  <div className="flex justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <p className="rounded-xl bg-white py-10 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">{text}</p>
);

const AdminCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
    {children}
  </section>
);

const MetricTile = ({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string; suffix?: string }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
    </div>
    <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white">
      {value}
      {!!suffix && <span className="ml-1 text-xs font-normal text-gray-400">{suffix}</span>}
    </p>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</span>
    {children}
  </label>
);

const selectClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white";

// ── Library habit editor ──────────────────────────────────────────

function LibraryHabitDialog({
  initial, saving, onClose, onSave,
}: { initial: IHabit; saving: boolean; onClose: () => void; onSave: (h: IHabit) => void }) {
  const [form, setForm] = useState<IHabit>(initial);
  useEffect(() => setForm(initial), [initial]);
  const set = <K extends keyof IHabit>(k: K, v: IHabit[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{form.IdHabit ? "Edit habit" : "New habit"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Name">
            <Input value={form.Name} onChange={(e) => set("Name", e.target.value)} placeholder="Drink 3L water" />
          </Field>
          <Field label="Description">
            <Input value={form.Description ?? ""} onChange={(e) => set("Description", e.target.value)} placeholder="Spread it across the day." />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className={selectClass} value={form.Category} onChange={(e) => set("Category", e.target.value)}>
                {HABIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Colour">
              <select className={selectClass} value={form.ColorKey} onChange={(e) => set("ColorKey", e.target.value)}>
                {Object.keys(HABIT_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Default target">
              <Input type="number" min={1} value={form.DefaultTargetCount} onChange={(e) => set("DefaultTargetCount", Math.max(1, Number(e.target.value)))} />
            </Field>
            <Field label="Unit">
              <Input value={form.Unit} onChange={(e) => set("Unit", e.target.value)} placeholder="times / L / min" />
            </Field>
          </div>

          <Field label="Auto-complete from tracker">
            <select
              className={selectClass}
              value={form.LinkedMetric ?? ""}
              onChange={(e) => set("LinkedMetric", (e.target.value || null) as IHabit["LinkedMetric"])}
            >
              <option value="">Manual — student ticks it</option>
              {LINKED_METRICS.map((m) => <option key={m} value={m}>{m} tracker</option>)}
            </select>
          </Field>
          <p className="-mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Linked habits tick themselves when the student logs that metric on their home page.
            Set the target in the same unit the tracker stores.
          </p>

          <Field label="Icon">
            <div className="grid grid-cols-7 gap-1.5">
              {HABIT_ICON_CHOICES.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  aria-pressed={form.Icon === name}
                  onClick={() => set("Icon", name)}
                  className={`flex aspect-square items-center justify-center rounded-lg border transition-colors ${
                    form.Icon === name
                      ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/60"
                      : "border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  <HabitIcon name={name} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !form.Name.trim()} onClick={() => onSave(form)}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Multi-select assign picker ────────────────────────────────────

function AssignPickerDialog({
  library, alreadyAssigned, clientName, saving, onClose, onAssign,
}: {
  library: IHabit[];
  alreadyAssigned: number[];
  clientName: string;
  saving: boolean;
  onClose: () => void;
  onAssign: (habits: Array<{ IdHabit: number; TargetCount: number; DaysOfWeek: string; StartDate: string }>) => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const available = library.filter((h) => !alreadyAssigned.includes(h.IdHabit!));

  const toggle = (id: number) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = () =>
    onAssign(
      picked.map((id) => {
        const h = library.find((x) => x.IdHabit === id)!;
        return {
          IdHabit: id,
          TargetCount: h.DefaultTargetCount,
          DaysOfWeek: EVERY_DAY,
          StartDate: moment().format(WIRE),
        };
      })
    );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to {clientName}</DialogTitle>
        </DialogHeader>

        {available.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Every library habit is already assigned. Add a new one in the Library tab.
          </p>
        ) : (
          <div className="space-y-1.5">
            {available.map((h) => {
              const c = habitColor(h.ColorKey);
              const on = picked.includes(h.IdHabit!);
              return (
                <button
                  key={h.IdHabit}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(h.IdHabit!)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                    on ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${c.bg} ${c.text}`}>
                    <HabitIcon name={h.Icon} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{h.Name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {h.Category} · {h.DefaultTargetCount} {h.Unit}
                    </p>
                  </div>
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      on ? "bg-blue-600 text-white" : "border-2 border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Assigned for every day starting today. Adjust days and targets afterwards.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || picked.length === 0} onClick={submit}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Assign {picked.length || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Per-student assignment editor ─────────────────────────────────

function AssignmentDialog({
  initial, saving, onClose, onSave,
}: { initial: IHabitAssignment; saving: boolean; onClose: () => void; onSave: (a: IHabitAssignment) => void }) {
  const [form, setForm] = useState<IHabitAssignment>(initial);
  useEffect(() => setForm(initial), [initial]);
  const set = <K extends keyof IHabitAssignment>(k: K, v: IHabitAssignment[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const days = form.DaysOfWeek ? form.DaysOfWeek.split(",") : [];
  const badRange =
    !!form.EndDate && moment(form.EndDate, WIRE).isBefore(moment(form.StartDate, WIRE), "day");
  const toggleDay = (value: string) => {
    const next = days.includes(value) ? days.filter((d) => d !== value) : [...days, value];
    // Keep stored order stable (Mon→Sun) so the string compares cleanly to EVERY_DAY.
    set("DaysOfWeek", next.sort().join(","));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{form.Name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Target (${form.Unit})`}>
              <Input type="number" min={1} value={form.TargetCount} onChange={(e) => set("TargetCount", Math.max(1, Number(e.target.value)))} />
            </Field>
            <Field label="Reminder time">
              <Input type="time" value={form.ReminderTime ?? ""} onChange={(e) => set("ReminderTime", e.target.value || null)} />
            </Field>
          </div>

          <Field label="Days of the week">
            <div className="flex gap-1.5">
              {DAYS_OF_WEEK.map((d) => {
                const on = days.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    aria-label={d.label}
                    aria-pressed={on}
                    onClick={() => toggleDay(d.value)}
                    className={`flex h-9 flex-1 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      on ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </Field>
          <p className="-mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Days that are off count as rest days — they won't break the student's streak.
          </p>

          {/* Date inputs speak YYYY-MM-DD; the API speaks DD-MM-YYYY. */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <Input
                type="date"
                value={form.StartDate ? moment(form.StartDate, WIRE).format("YYYY-MM-DD") : ""}
                onChange={(e) =>
                  set("StartDate", e.target.value ? moment(e.target.value, "YYYY-MM-DD").format(WIRE) : form.StartDate)
                }
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                min={form.StartDate ? moment(form.StartDate, WIRE).format("YYYY-MM-DD") : undefined}
                value={form.EndDate ? moment(form.EndDate, WIRE).format("YYYY-MM-DD") : ""}
                onChange={(e) =>
                  set("EndDate", e.target.value ? moment(e.target.value, "YYYY-MM-DD").format(WIRE) : null)
                }
              />
            </Field>
          </div>
          <p className={`-mt-1 text-[11px] ${badRange ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
            {badRange
              ? "The end date is before the start date."
              : "Leave the end date blank to run this habit indefinitely."}
          </p>

          <Field label="Notes for the student">
            <Input value={form.Notes ?? ""} onChange={(e) => set("Notes", e.target.value)} placeholder="Optional" />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || days.length === 0 || badRange} onClick={() => onSave(form)}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
