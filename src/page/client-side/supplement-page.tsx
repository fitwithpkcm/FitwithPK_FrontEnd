"use client";

import React, { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Check, Loader2, Bell, BellOff, BellRing,
} from "lucide-react";
import { useFcmNotification } from "../../hooks/use-fcm-notification";
import moment from "moment";
import toast from "react-hot-toast";

import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { MobileNav } from "../../components/layout/mobile-nav";
import { useAuth } from "../../hooks/use-auth";
import { queryClient } from "../../lib/queryClient";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { getMySupplements, getMySupplementLogs, logSupplement } from "../../services/SupplementService";
import {
  ISupplement, ISupplementLog, SUPPLEMENT_TIMINGS,
  TIMING_ICONS, TIMING_COLORS, SupplementTiming,
} from "../../interface/ISupplement";

// ── date helpers ──────────────────────────────────────────────────

function ddmmyyyy(m: moment.Moment) { return m.format("DD-MM-YYYY"); }

// ── Check if a supplement is due "now" (within ±30 min of reminder) ──

function isDueNow(reminderTime?: string): boolean {
  if (!reminderTime) return false;
  const [h, m] = reminderTime.split(":").map(Number);
  const now = moment();
  const due = moment().hours(h).minutes(m).seconds(0);
  return Math.abs(now.diff(due, "minutes")) <= 30;
}

// ── Fire a browser notification (foreground only — background handled by FCM SW) ──

function fireNotification(name: string, dose: string, timing: string) {
  if (Notification.permission !== "granted") return;
  new Notification("💊 Supplement Reminder", {
    body: `Time to take your ${name}${dose ? ` — ${dose}` : ""} (${timing})`,
    icon: "/icons/icon-192x192.png",
    tag: `supp-${name}`,
  });
}

// ── Main Page ─────────────────────────────────────────────────────

export default function SupplementPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  useEffect(() => { setBaseUrl(BASE_URL); }, []);

  const [selectedDate, setSelectedDate] = useState(ddmmyyyy(moment()));
  const { status: fcmStatus, requestPermission } = useFcmNotification();
  const notifFiredRef = useRef<Set<number>>(new Set());
  const isToday = selectedDate === ddmmyyyy(moment());
  const notifEnabled = fcmStatus === "granted";

  // ── Queries ──────────────────────────────────────────────────────

  const { data: suppsRes, isLoading: suppsLoading } = useQuery({
    queryKey: ["my-supplements"],
    queryFn: () => getMySupplements(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const supplements: ISupplement[] = Array.isArray(suppsRes?.data?.data) ? suppsRes.data.data : [];

  const { data: logsRes, refetch: refetchLogs } = useQuery({
    queryKey: ["my-supplement-logs", selectedDate],
    queryFn: () => getMySupplementLogs(selectedDate),
    enabled: !!user,
    staleTime: 30_000,
  });
  const logs: ISupplementLog[] = Array.isArray(logsRes?.data?.data) ? logsRes.data.data : [];

  // ── Fire notifications for due supplements ───────────────────────

  useEffect(() => {
    if (!isToday || !notifEnabled || supplements.length === 0) return;
    supplements.forEach(s => {
      if (!s.ReminderTime || !s.IdSupplement) return;
      if (notifFiredRef.current.has(s.IdSupplement)) return;
      if (isDueNow(s.ReminderTime)) {
        const taken = logs.some(l => l.IdSupplement === s.IdSupplement && l.IsTaken === 1);
        if (!taken) {
          fireNotification(s.Name, s.Dose ?? "", s.Timing);
          notifFiredRef.current.add(s.IdSupplement);
        }
      }
    });
  }, [supplements, logs, isToday, notifEnabled]);

  // ── Mutation ──────────────────────────────────────────────────────

  const logMut = useMutation({
    mutationFn: logSupplement,
    onSuccess: () => { refetchLogs(); },
    onError: () => toast.error("Failed to log"),
  });

  const toggleTaken = (s: ISupplement, currentlyTaken: boolean) => {
    logMut.mutate({
      IdSupplement: s.IdSupplement!,
      LogDate: selectedDate,
      IsTaken: currentlyTaken ? 0 : 1,
    });
  };

  // ── Enable notifications ──────────────────────────────────────────

  const handleEnableNotif = async () => {
    await requestPermission();
    if (Notification.permission === "denied")
      toast.error("Please allow notifications in your browser settings.");
  };

  // ── group by timing ───────────────────────────────────────────────

  const grouped = SUPPLEMENT_TIMINGS.reduce((acc, t) => {
    acc[t] = supplements.filter(s => s.Timing === t);
    return acc;
  }, {} as Record<string, ISupplement[]>);

  const totalCount  = supplements.length;
  const takenCount  = logs.filter(l => l.IsTaken === 1).length;
  const allTaken    = totalCount > 0 && takenCount >= totalCount;

  if (embedded) {
    return (
      <div className="space-y-4">
        {/* date nav + progress */}
        <div className="bg-gradient-to-br from-violet-700 to-violet-900 text-white rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedDate(ddmmyyyy(moment(selectedDate, "DD-MM-YYYY").subtract(1, "day")))}
              className="p-1 text-violet-200 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
            <div className="text-center">
              <p className="text-sm font-semibold">
                {isToday ? "Today" : moment(selectedDate, "DD-MM-YYYY").format("D MMMM YYYY")}
              </p>
              {totalCount > 0 && <p className="text-xs text-violet-200 mt-0.5">{takenCount}/{totalCount} taken {allTaken && "✅"}</p>}
            </div>
            <button onClick={() => setSelectedDate(ddmmyyyy(moment(selectedDate, "DD-MM-YYYY").add(1, "day")))}
              disabled={isToday} className="p-1 text-violet-200 hover:text-white disabled:opacity-30">
              <ChevronRight className="h-5 w-5" /></button>
          </div>
          {totalCount > 0 && (
            <div className="mt-2 bg-white/20 rounded-full h-1.5">
              <div className="bg-white h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((takenCount / totalCount) * 100)}%` }} />
            </div>
          )}
        </div>
        {suppsLoading && <div className="flex justify-center py-8"><Loader2 className="h-7 w-7 animate-spin text-violet-500" /></div>}
        {!suppsLoading && supplements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-3xl mb-2">💊</div>
            <p className="text-sm font-semibold text-gray-500">No supplements assigned</p>
            <p className="text-xs text-gray-400 mt-1">Your coach will add your supplement plan here.</p>
          </div>
        )}
        {SUPPLEMENT_TIMINGS.map(timing => {
          const group = grouped[timing];
          if (!group?.length) return null;
          return (
            <div key={timing}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{TIMING_ICONS[timing]}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{timing}</span>
              </div>
              <div className="space-y-2">
                {group.map(s => {
                  const log = logs.find(l => l.IdSupplement === s.IdSupplement);
                  const taken = log?.IsTaken === 1;
                  const dueNow = isToday && isDueNow(s.ReminderTime);
                  return (
                    <Card key={s.IdSupplement} className={`border transition-all ${taken ? "bg-green-50 dark:bg-green-900/10 border-green-200" : dueNow ? "bg-amber-50 dark:bg-amber-900/10 border-amber-300 shadow-sm" : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"}`}>
                      <CardContent className="px-4 py-3 flex items-center gap-3">
                        <button onClick={() => toggleTaken(s, taken)} disabled={logMut.isPending}
                          className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${taken ? "border-green-500 bg-green-500 text-white" : dueNow ? "border-amber-400 bg-amber-50" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"}`}>
                          {taken && <Check className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-semibold ${taken ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-100"}`}>{s.Name}</p>
                            {s.Dose && <Badge className={`text-[10px] h-4 px-1.5 border-0 ${TIMING_COLORS[timing as SupplementTiming]}`}>{s.Dose}</Badge>}
                            {dueNow && !taken && <Badge className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 border-0 animate-pulse">Due now</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {s.Duration && <span className="text-[10px] text-violet-500">⏱ {s.Duration}</span>}
                            {s.ReminderTime && <span className="text-[10px] text-gray-400">⏰ {s.ReminderTime}</span>}
                            {s.Notes && <span className="text-[10px] text-gray-400 truncate">{s.Notes}</span>}
                            {taken && log?.TakenAt && <span className="text-[10px] text-green-500">✓ {moment(log.TakenAt).format("h:mm a")}</span>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* header */}
      <div className="bg-gradient-to-br from-violet-700 to-violet-900 text-white px-4 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">Supplements</p>
            <p className="text-xs text-violet-200 mt-0.5">Daily supplement tracker</p>
          </div>
          <button
            onClick={notifEnabled ? undefined : handleEnableNotif}
            disabled={fcmStatus === "requesting"}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              notifEnabled
                ? "border-green-300/50 bg-green-500/20 text-green-200"
                : fcmStatus === "denied"
                ? "border-red-300/50 bg-red-500/10 text-red-200"
                : "border-white/30 bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {notifEnabled
              ? <><BellRing className="h-3 w-3" /> Reminders on</>
              : fcmStatus === "denied"
              ? <><BellOff className="h-3 w-3" /> Blocked</>
              : fcmStatus === "requesting"
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Enabling…</>
              : <><Bell className="h-3 w-3" /> Enable reminders</>
            }
          </button>
        </div>

        {/* date nav */}
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setSelectedDate(ddmmyyyy(moment(selectedDate, "DD-MM-YYYY").subtract(1, "day")))}
            className="p-1.5 text-violet-200 hover:text-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold">
              {isToday ? "Today" : moment(selectedDate, "DD-MM-YYYY").format("D MMMM YYYY")}
            </p>
            {totalCount > 0 && (
              <p className="text-xs text-violet-200 mt-0.5">
                {takenCount}/{totalCount} taken {allTaken && "✅"}
              </p>
            )}
          </div>
          <button
            onClick={() => setSelectedDate(ddmmyyyy(moment(selectedDate, "DD-MM-YYYY").add(1, "day")))}
            disabled={isToday}
            className="p-1.5 text-violet-200 hover:text-white disabled:opacity-30">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* progress bar */}
        {totalCount > 0 && (
          <div className="mt-3 bg-white/20 rounded-full h-1.5">
            <div
              className="bg-white h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((takenCount / totalCount) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4">

        {suppsLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
          </div>
        )}

        {!suppsLoading && supplements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-3 text-3xl">
              💊
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No supplements assigned</p>
            <p className="text-xs text-gray-400 mt-1">Your coach will add your supplement plan here.</p>
          </div>
        )}

        {SUPPLEMENT_TIMINGS.map(timing => {
          const group = grouped[timing];
          if (!group?.length) return null;

          return (
            <div key={timing}>
              {/* timing header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{TIMING_ICONS[timing]}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{timing}</span>
              </div>

              <div className="space-y-2">
                {group.map(s => {
                  const log = logs.find(l => l.IdSupplement === s.IdSupplement);
                  const taken = log?.IsTaken === 1;
                  const dueNow = isToday && isDueNow(s.ReminderTime);

                  return (
                    <Card key={s.IdSupplement}
                      className={`border transition-all ${
                        taken
                          ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50"
                          : dueNow
                          ? "bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-700 shadow-amber-100 dark:shadow-amber-900/20 shadow-sm"
                          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                      }`}>
                      <CardContent className="px-4 py-3 flex items-center gap-3">

                        {/* tick button */}
                        <button
                          onClick={() => toggleTaken(s, taken)}
                          disabled={logMut.isPending}
                          className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                            taken
                              ? "border-green-500 bg-green-500 text-white"
                              : dueNow
                              ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-violet-400"
                          }`}
                        >
                          {taken && <Check className="h-4 w-4" />}
                        </button>

                        {/* info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-semibold ${taken ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-100"}`}>
                              {s.Name}
                            </p>
                            {s.Dose && (
                              <Badge className={`text-[10px] h-4 px-1.5 border-0 ${TIMING_COLORS[timing as SupplementTiming]}`}>
                                {s.Dose}
                              </Badge>
                            )}
                            {dueNow && !taken && (
                              <Badge className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0 animate-pulse">
                                Due now
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {s.Duration && (
                              <span className="text-[10px] text-violet-500 dark:text-violet-400">⏱ {s.Duration}</span>
                            )}
                            {s.ReminderTime && (
                              <span className="text-[10px] text-gray-400">⏰ {s.ReminderTime}</span>
                            )}
                            {s.Notes && (
                              <span className="text-[10px] text-gray-400 truncate">{s.Notes}</span>
                            )}
                            {taken && log?.TakenAt && (
                              <span className="text-[10px] text-green-500">
                                ✓ {moment(log.TakenAt).format("h:mm a")}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>

      <MobileNav />
    </div>
  );
}
