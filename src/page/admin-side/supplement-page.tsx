"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, User, Loader2, Check, X, ChevronDown, AlertCircle, Clock,
} from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { queryClient } from "../../lib/queryClient";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { getUserListForACoach } from "../../services/AdminServices";
import {
  getSupplementsForClient, createSupplement, updateSupplement,
  deleteSupplement, getSupplementAdherence, getSupplementDetailLogs,
} from "../../services/SupplementService";
import {
  ISupplement, ISupplementAdherence,
  SUPPLEMENT_TIMINGS, TIMING_COLORS, TIMING_ICONS, SupplementTiming,
  DAYS_OF_WEEK, SupplementFrequency,
} from "../../interface/ISupplement";
import { IUser } from "../../interface/models/User";

// ── blank supplement ──────────────────────────────────────────────

const DURATION_OPTIONS = [
  "", "7 days", "14 days", "30 days", "60 days", "90 days",
  "4 weeks", "8 weeks", "12 weeks", "Ongoing",
];

function blank(IdUser: number): ISupplement {
  return { IdUser, Name: "", Dose: "", Timing: "Morning", Duration: "", ReminderTime: "", Notes: "", Frequency: "Daily", DaysOfWeek: "" };
}

function parseDays(val: string | undefined): number[] {
  if (!val) return [];
  return val.split(',').map(Number).filter(n => !isNaN(n));
}

function formatDaySchedule(s: ISupplement): string {
  if (s.Frequency !== 'Weekly' || !s.DaysOfWeek) return 'Daily';
  const days = parseDays(s.DaysOfWeek).map(d => DAYS_OF_WEEK.find(x => x.value === d)?.label ?? '').filter(Boolean);
  return `Weekly · ${days.join(', ')}`;
}

function durationToWeeks(duration: string | undefined): number | null {
  if (!duration) return null;
  const weeks = duration.match(/^(\d+)\s*weeks?$/i);
  if (weeks) return parseInt(weeks[1]);
  const days = duration.match(/^(\d+)\s*days?$/i);
  if (days) return Math.floor(parseInt(days[1]) / 7);
  return null;
}

function buildSchedulePreview(form: ISupplement): string | null {
  if (form.Frequency !== 'Weekly') return null;
  const selectedDays = parseDays(form.DaysOfWeek);
  if (selectedDays.length === 0) return null;

  const dayNames = selectedDays
    .map(d => DAYS_OF_WEEK.find(x => x.value === d)?.label ?? '')
    .filter(Boolean)
    .join(' & ');

  const totalWeeks = durationToWeeks(form.Duration);
  if (!totalWeeks) {
    return `Every ${dayNames} — ongoing`;
  }

  const totalDoses = totalWeeks * selectedDays.length;
  const endDate = moment().add(totalWeeks, 'weeks').subtract(1, 'day');
  return `Every ${dayNames} for ${totalWeeks} weeks = ${totalDoses} dose${totalDoses !== 1 ? 's' : ''}, ends ${endDate.format('D MMM YYYY')}`;
}

// ── Supplement Form Dialog ────────────────────────────────────────

function SupplementFormDialog({
  open, initial, onClose, onSave, saving,
}: {
  open: boolean;
  initial: ISupplement;
  onClose: () => void;
  onSave: (s: ISupplement) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ISupplement>(initial);
  useEffect(() => { setForm(initial); }, [initial]);

  const set = (k: keyof ISupplement, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm mx-4 rounded-2xl dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-base">
            {initial.IdSupplement ? "Edit Supplement" : "Add Supplement"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Name *</label>
            <Input value={form.Name} onChange={e => set("Name", e.target.value)} placeholder="e.g. Creatine, Vitamin D3" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Dose</label>
            <Input value={form.Dose ?? ""} onChange={e => set("Dose", e.target.value)} placeholder="e.g. 5g, 2 capsules" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Timing</label>
            <div className="relative">
              <select
                value={form.Timing}
                onChange={e => set("Timing", e.target.value as SupplementTiming)}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 appearance-none pr-8"
              >
                {SUPPLEMENT_TIMINGS.map(t => (
                  <option key={t} value={t}>{TIMING_ICONS[t]} {t}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Duration</label>
            <div className="relative">
              <select
                value={form.Duration ?? ""}
                onChange={e => set("Duration", e.target.value)}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 appearance-none pr-8"
              >
                {DURATION_OPTIONS.map(d => (
                  <option key={d} value={d}>{d === "" ? "Select duration…" : d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
              Reminder Time <span className="font-normal">(optional)</span>
            </label>
            <Input
              type="time"
              value={form.ReminderTime ?? ""}
              onChange={e => set("ReminderTime", e.target.value)}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Client will receive a daily reminder at this time</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Frequency</label>
            <div className="flex gap-2">
              {(['Daily', 'Weekly'] as SupplementFrequency[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { set("Frequency", f); if (f === 'Daily') set("DaysOfWeek", ""); }}
                  className={`flex-1 py-1.5 rounded-md text-sm border transition-colors ${form.Frequency === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {form.Frequency === 'Weekly' && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Days of the Week</label>
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map(({ label, value }) => {
                  const selected = parseDays(form.DaysOfWeek).includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        const current = parseDays(form.DaysOfWeek);
                        const next = selected ? current.filter(d => d !== value) : [...current, value].sort((a, b) => a - b);
                        set("DaysOfWeek", next.join(','));
                      }}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {parseDays(form.DaysOfWeek).length === 0 && (
                <p className="text-[10px] text-red-400 mt-1">Select at least one day</p>
              )}
            </div>
          )}

          {form.Frequency === 'Weekly' && parseDays(form.DaysOfWeek).length > 0 && (() => {
            const preview = buildSchedulePreview(form);
            return preview ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">📅 {preview}</p>
                {!durationToWeeks(form.Duration) && (
                  <p className="text-[10px] text-blue-400 mt-0.5">Set a duration above to see end date & total doses</p>
                )}
              </div>
            ) : null;
          })()}

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Notes</label>
            <Input value={form.Notes ?? ""} onChange={e => set("Notes", e.target.value)} placeholder="e.g. Take with food" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={() => onSave(form)} disabled={saving || !form.Name.trim() || (form.Frequency === 'Weekly' && parseDays(form.DaysOfWeek).length === 0)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Adherence bar ─────────────────────────────────────────────────

function AdherenceBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

// ── Supplement Detail Modal ───────────────────────────────────────

interface DetailLog { LogDate: string; IsTaken: number; TakenAt?: string; Notes?: string; }

function SupplementDetailModal({
  open, supplement, clientId, onClose,
}: {
  open: boolean;
  supplement: ISupplementAdherence | null;
  clientId: number;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<DetailLog[]>({
    queryKey: ["supplement-detail-logs", supplement?.IdSupplement, clientId],
    queryFn: () =>
      getSupplementDetailLogs({ IdSupplement: supplement!.IdSupplement, IdUser: clientId, days: 30 })
        .then(r => r.data.data),
    enabled: open && !!supplement,
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm mx-4 rounded-2xl dark:bg-gray-900 max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <span>{TIMING_ICONS[supplement?.Timing as SupplementTiming] ?? "💊"}</span>
            {supplement?.Name}
          </DialogTitle>
          <p className="text-xs text-gray-400">{supplement?.Timing} · last 30 days</p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" size={20} /></div>
          ) : !data?.length ? (
            <p className="text-sm text-gray-400 text-center py-8">No logs recorded yet.</p>
          ) : (
            <div className="space-y-2 py-2">
              {data.map((log, i) => {
                const taken = log.IsTaken === 1;
                const [d, m, y] = log.LogDate.split('-');
                const displayDate = moment(`${y}-${m}-${d}`).format('ddd, D MMM');
                const takenTime = log.TakenAt ? moment(log.TakenAt).format('h:mm a') : null;
                return (
                  <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${taken ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${taken ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {taken ? <Check size={14} /> : <X size={14} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{displayDate}</p>
                        {log.Notes && <p className="text-xs text-gray-400">{log.Notes}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      {taken ? (
                        <p className="text-xs text-green-600 font-medium">{takenTime ?? 'Taken'}</p>
                      ) : (
                        <p className="text-xs text-red-500 font-medium">Missed</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function AdminSupplementPage() {
  useEffect(() => { setBaseUrl(BASE_URL); console.log("Base URL set to PODA PODA:", ); }, []);

  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [tab, setTab] = useState<"supplements" | "adherence">("supplements");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ISupplement | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSupplement, setDetailSupplement] = useState<ISupplementAdherence | null>(null);

  // ── queries ───────────────────────────────────────────────────

  const { data: clientsRes, isLoading: clientsLoading } = useQuery({
    queryKey: ["users-for-coach-supplement"],
    queryFn: () => getUserListForACoach({}),
    staleTime: 60_000,
  });
  const clients: IUser[] = clientsRes?.data?.data ?? [];

  const { data: suppsRes, isLoading } = useQuery({
    queryKey: ["supplements", selectedClient],
    queryFn: () => getSupplementsForClient(selectedClient!),
    enabled: !!selectedClient,
    staleTime: 0,
  });
  const supplements: ISupplement[] = Array.isArray(suppsRes?.data?.data) ? suppsRes.data.data : [];

  const { data: adherenceRes } = useQuery({
    queryKey: ["supplement-adherence", selectedClient],
    queryFn: () => getSupplementAdherence({ IdUser: selectedClient!, days: 30 }),
    enabled: !!selectedClient && tab === "adherence",
    staleTime: 60_000,
  });
  const adherence: ISupplementAdherence[] = Array.isArray(adherenceRes?.data?.data) ? adherenceRes.data.data : [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["supplements", selectedClient] });
    queryClient.invalidateQueries({ queryKey: ["supplement-adherence", selectedClient] });
  };

  // ── mutations ─────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: createSupplement,
    onSuccess: () => { toast.success("Supplement added!"); invalidate(); setEditorOpen(false); },
    onError: () => toast.error("Failed to add"),
  });

  const updateMut = useMutation({
    mutationFn: updateSupplement,
    onSuccess: () => { toast.success("Supplement updated!"); invalidate(); setEditorOpen(false); },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSupplement,
    onSuccess: () => { toast.success("Removed"); invalidate(); },
    onError: () => toast.error("Failed to remove"),
  });

  const handleSave = (s: ISupplement) => {
    if (s.IdSupplement) updateMut.mutate(s);
    else createMut.mutate({ ...s, IdUser: selectedClient! });
  };

  const saving = createMut.isPending || updateMut.isPending;

  // group by timing
  const grouped = SUPPLEMENT_TIMINGS.reduce((acc, t) => {
    acc[t] = supplements.filter(s => s.Timing === t);
    return acc;
  }, {} as Record<string, ISupplement[]>);

  const selectedClientUser = clients.find(c => c.IdUser === selectedClient);
  const selectedClientName = selectedClientUser
    ? `${selectedClientUser.FirstName ?? ""} ${selectedClientUser.LastName ?? ""}`.trim()
    : "";

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* header */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white px-4 pt-12 pb-4">
        <p className="text-lg font-bold">Supplements</p>
        <p className="text-xs text-blue-200 mt-0.5">Assign and track client supplements</p>

        {/* client picker */}
        <div className="relative mt-3">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-violet-300 pointer-events-none" />
          {clientsLoading ? (
            <div className="h-10 bg-white/20 rounded-xl animate-pulse" />
          ) : (
            <select
              value={selectedClient ?? ""}
              onChange={e => setSelectedClient(e.target.value ? Number(e.target.value) : null)}
              className="w-full pl-9 pr-4 py-2 bg-white/15 border border-white/20 rounded-xl text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <option value="" className="bg-violet-900 text-white">Select a client…</option>
              {clients.map(c => (
                <option key={c.IdUser} value={c.IdUser} className="bg-violet-900 text-white">
                  {c.FirstName} {c.LastName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* tabs */}
      <div className="flex-shrink-0 flex bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        {(["supplements", "adherence"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-500 dark:text-gray-400"
            }`}>
            {t === "supplements" ? "Supplements" : "Adherence (30d)"}
          </button>
        ))}
      </div>

      {/* content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28 bg-gray-50 dark:bg-gray-950 space-y-3">

        {!selectedClient && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <User className="h-7 w-7 text-gray-400 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Select a client</p>
            <p className="text-xs text-gray-400 mt-1">Choose a client to manage their supplements.</p>
          </div>
        )}

        {/* ── Supplements tab ─── */}
        {selectedClient && tab === "supplements" && (
          <>
            <Button size="sm" onClick={() => { setEditing(blank(selectedClient)); setEditorOpen(true); }}
              className="w-full bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" /> Add Supplement for {selectedClientName}
            </Button>

            {isLoading && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              </div>
            )}

            {!isLoading && supplements.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-gray-400">No supplements assigned yet.</p>
              </div>
            )}

            {SUPPLEMENT_TIMINGS.map(timing => {
              const group = grouped[timing];
              if (!group?.length) return null;
              return (
                <div key={timing}>
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <span className="text-base">{TIMING_ICONS[timing]}</span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{timing}</span>
                  </div>
                  <div className="space-y-2">
                    {group.map(s => (
                      <Card key={s.IdSupplement} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <CardContent className="px-4 py-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.Name}</p>
                              {s.Dose && (
                                <Badge className="text-[10px] h-4 px-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-0">
                                  {s.Dose}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {s.Duration && (
                                <span className="flex items-center gap-0.5 text-[11px] text-violet-500 dark:text-violet-400">
                                  <Clock className="h-3 w-3" />{s.Duration}
                                </span>
                              )}
                              <span className="text-[11px] text-blue-500 dark:text-blue-400 font-medium">
                                🔁 {formatDaySchedule(s)}
                              </span>
                              {s.ReminderTime && (
                                <span className="text-[11px] text-blue-500 dark:text-blue-400">⏰ {s.ReminderTime}</span>
                              )}
                              {s.CreatedAt && (
                                <span className="text-[11px] text-gray-400">
                                  since {moment(s.CreatedAt).format("D MMM YYYY")}
                                </span>
                              )}
                            </div>
                            {s.Notes && (
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{s.Notes}</p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => { setEditing(s); setEditorOpen(true); }}
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { if (confirm("Remove this supplement?")) deleteMut.mutate(s.IdSupplement!); }}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── Adherence tab ─── */}
        {selectedClient && tab === "adherence" && (
          <>
            {adherence.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-gray-400">No adherence data yet.</p>
                <p className="text-xs text-gray-400 mt-1">Client needs to start logging supplements.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {adherence.map(a => {
                  const pct = a.TotalDays > 0 ? Math.round((a.DaysTaken / a.TotalDays) * 100) : 0;
                  const missed = a.TotalDays - a.DaysTaken;
                  return (
                    <Card key={a.IdSupplement} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm cursor-pointer active:scale-[0.98] transition-transform" onClick={() => { setDetailSupplement(a); setDetailOpen(true); }}>
                      <CardContent className="px-4 py-3">
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{TIMING_ICONS[a.Timing as SupplementTiming] ?? "💊"}</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{a.Name}</p>
                              <p className="text-[10px] text-gray-400">{a.Timing} · {a.TotalDays} days tracked</p>
                            </div>
                          </div>
                          <p className={`text-lg font-bold ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-500" : "text-red-500"}`}>{pct}%</p>
                        </div>

                        {/* Progress bar */}
                        <AdherenceBar pct={pct} />

                        {/* Taken / Missed pills */}
                        <div className="flex gap-2 mt-2">
                          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full px-3 py-1 flex-1 justify-center">
                            <Check size={12} />
                            <span className="text-xs font-semibold">{a.DaysTaken} taken</span>
                          </div>
                          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full px-3 py-1 flex-1 justify-center">
                            <X size={12} />
                            <span className="text-xs font-semibold">{missed} missed</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <MobileAdminNav />

      {editorOpen && editing && (
        <SupplementFormDialog
          open={editorOpen}
          initial={editing}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {selectedClient && (
        <SupplementDetailModal
          open={detailOpen}
          supplement={detailSupplement}
          clientId={selectedClient}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  );
}
