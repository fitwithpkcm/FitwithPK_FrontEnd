"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Check, MessageSquare, X,
  Loader2, UtensilsCrossed, TrendingUp, Save, HelpCircle, Send, ChevronDown, ChevronUp, RefreshCw, MessageCircle, CalendarDays,
} from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";

import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "../../components/ui/dialog";
import { MobileNav } from "../../components/layout/mobile-nav";
import { PageHeader } from "../../components/layout/page-header";
import { useAuth } from "../../hooks/use-auth";
import { queryClient } from "../../lib/queryClient";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import {
  getMyMealPlans, getMyMealLogs,
  logFoodConsumption, batchLogFoodConsumption,
} from "../../services/MealPlanService";
import {
  IMealQuery, askMealQuery, getMyMealQueries,
} from "../../services/MealQueryService";
import {
  IMealPlan, IMealLog, IMealFoodItemWithLog, MealType,
  MEAL_TYPES, MEAL_META, mergePlanWithLogs, IMealPlanWithLogs,
} from "../../interface/IMealPlan";

// ── helpers ──────────────────────────────────────────────────────

function fmtDate(d: string) {
  return moment(d, "DD-MM-YYYY").format("ddd, MMM D");
}

// ── AdherenceBadge ────────────────────────────────────────────────

function AdherenceBadge({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
    : pct >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      <TrendingUp className="h-3 w-3" />
      {pct}% adherence
    </span>
  );
}

// ── FoodItemRow ───────────────────────────────────────────────────

interface FoodItemRowProps {
  item: IMealFoodItemWithLog;
  isSaving: boolean;
  readOnly?: boolean;
  onToggle: () => void;
  onQtyChange: (qty: number) => void;
  onNotesClick: () => void;
}

function FoodItemRow({ item, isSaving, readOnly, onToggle, onQtyChange, onNotesClick }: FoodItemRowProps) {
  const [localQty, setLocalQty] = useState(item.consumedQty.toString());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // sync external changes (e.g. after save)
  useEffect(() => { setLocalQty(item.consumedQty.toString()); }, [item.consumedQty]);

  const handleQtyChange = (val: string) => {
    setLocalQty(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const n = parseFloat(val);
      if (!isNaN(n) && n > 0) onQtyChange(n);
    }, 600);
  };

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-300 ${
      item.isConsumed
        ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
        : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
    }`}>
      {/* Checkbox — hidden on future dates */}
      {!readOnly && (
        <button
          onClick={onToggle}
          disabled={isSaving}
          className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            item.isConsumed
              ? "bg-green-500 border-green-500 scale-110"
              : "border-gray-300 dark:border-gray-600 hover:border-green-400"
          }`}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
          ) : item.isConsumed ? (
            <Check className="h-3.5 w-3.5 text-white" />
          ) : null}
        </button>
      )}

      {/* Food details */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          item.isConsumed
            ? "text-green-800 dark:text-green-200 line-through decoration-green-400"
            : "text-gray-800 dark:text-gray-200"
        }`}>
          {item.FoodName}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          Planned: {item.PlannedQty} {item.Unit}
        </p>
      </div>

      {/* Consumed qty (visible when checked) */}
      {item.isConsumed && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Input
            type="number"
            value={localQty}
            onChange={e => handleQtyChange(e.target.value)}
            className="w-14 h-7 text-xs text-center p-1 bg-white dark:bg-gray-800 border-green-200 dark:border-green-700"
            min="0"
            step="any"
            onClick={e => e.stopPropagation()}
          />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.Unit}</span>
        </div>
      )}

      {/* Notes indicator / button */}
      <button
        onClick={onNotesClick}
        className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
          item.logNotes
            ? "text-blue-500 bg-blue-50 dark:bg-blue-900/30"
            : "text-gray-300 dark:text-gray-600 hover:text-gray-500"
        }`}
        title={item.logNotes || "Add note"}
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── MealSection ────────────────────────────────────────────────────

interface MealSectionProps {
  mealType: MealType;
  items: IMealFoodItemWithLog[];
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  savingIds: Set<number>;
  readOnly?: boolean;
  onToggle: (item: IMealFoodItemWithLog) => void;
  onQtyChange: (item: IMealFoodItemWithLog, qty: number) => void;
  onNotesClick: (item: IMealFoodItemWithLog) => void;
}

function MealSection({
  mealType, items, completedCount, totalCount, completionPercent,
  savingIds, readOnly, onToggle, onQtyChange, onNotesClick,
}: MealSectionProps) {
  const meta = MEAL_META[mealType];
  const [collapsed, setCollapsed] = useState(false);

  if (totalCount === 0) return null;

  return (
    <div className={`rounded-xl overflow-hidden border-2 ${meta.borderColor}`}>
      {/* header */}
      <button
        className={`w-full flex items-center justify-between px-4 py-3 ${meta.headerBg}`}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{meta.emoji}</span>
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
            {meta.label}
          </span>
          <Badge className={`text-[10px] h-5 ${meta.badgeBg} ${meta.badgeText} border-0`}>
            {completedCount}/{totalCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16">
            <Progress value={completionPercent} className="h-1.5" />
          </div>
          <span className={`text-[10px] font-semibold ${meta.badgeText}`}>
            {completionPercent}%
          </span>
        </div>
      </button>

      {!collapsed && (
        <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
          {items.map(item => (
            <FoodItemRow
              key={item.IdFoodItem ?? item.SortOrder}
              item={item}
              isSaving={item.IdFoodItem != null && savingIds.has(item.IdFoodItem)}
              readOnly={readOnly}
              onToggle={() => onToggle(item)}
              onQtyChange={qty => onQtyChange(item, qty)}
              onNotesClick={() => onNotesClick(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function MealTrackingPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(moment().format("DD-MM-YYYY"));
  const [calendarOpen, setCalendarOpen] = useState(false);

  // local log overrides (optimistic + pending changes)
  const [localLogs, setLocalLogs] = useState<Map<number, IMealLog>>(new Map());
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  // notes dialog
  const [notesItem, setNotesItem] = useState<IMealFoodItemWithLog | null>(null);
  const [notesText, setNotesText] = useState("");

  // Q&A
  const [questionText, setQuestionText] = useState("");
  const [qaOpen, setQaOpen] = useState(false);

  useEffect(() => { setBaseUrl(BASE_URL); }, []);

  // ── queries ───────────────────────────────────────────────────

  const { data: rawPlan, isLoading: planLoading } = useQuery<IMealPlan | null>({
    queryKey: ["my-meal-plan", selectedDate],
    queryFn: async () => {
      const res = await getMyMealPlans({ AssignedDate: selectedDate }) as {
        data: { data: IMealPlan[] };
      };
      const plans = res.data?.data ?? [];
      return plans.length > 0 ? plans[0] : null;
    },
  });

  const { data: logsRaw = [], isLoading: logsLoading } = useQuery<IMealLog[]>({
    queryKey: ["my-meal-logs", selectedDate],
    enabled: !!rawPlan,
    queryFn: async () => {
      const res = await getMyMealLogs({ LogDate: selectedDate }) as {
        data: { data: IMealLog[] };
      };
      return res.data?.data ?? [];
    },
  });

  // merge server logs with local overrides
  useEffect(() => {
    if (logsRaw.length > 0) {
      const m = new Map<number, IMealLog>();
      logsRaw.forEach(l => m.set(l.IdFoodItem, l));
      setLocalLogs(m);
    }
  }, [logsRaw]);

  // compute merged plan
  const mergedPlan: IMealPlanWithLogs | null =
    rawPlan
      ? mergePlanWithLogs(rawPlan, Array.from(localLogs.values()))
      : null;

  // ── Q&A queries ───────────────────────────────────────────────

  const { data: myQueries = [], refetch: refetchQueries, isFetching: queriesFetching } = useQuery<IMealQuery[]>({
    queryKey: ["my-meal-queries", selectedDate],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    queryFn: async () => {
      const res = await getMyMealQueries({ QueryDate: selectedDate }) as any;
      const d = res.data?.data;
      return Array.isArray(d) ? d : [];
    },
  });

  const askMutation = useMutation({
    mutationFn: (question: string) => askMealQuery({ QueryDate: selectedDate, Question: question }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-meal-queries", selectedDate] });
      setQuestionText("");
      toast.success("Question sent to your coach!");
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  // ── mutation ──────────────────────────────────────────────────

  const logMutation = useMutation({
    mutationFn: (log: IMealLog) => logFoodConsumption(log),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-meal-logs", selectedDate] });
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });

  // ── handlers ──────────────────────────────────────────────────

  const handleToggle = useCallback((item: IMealFoodItemWithLog) => {
    if (!rawPlan?.IdMealPlan || item.IdFoodItem == null) return;
    if (moment(selectedDate, "DD-MM-YYYY").isAfter(moment().startOf("day"), "day")) {
      toast.error("You can't mark meals for future days");
      return;
    }

    const newIsConsumed: 0 | 1 = item.isConsumed ? 0 : 1;
    const existingLog = localLogs.get(item.IdFoodItem);

    const newLog: IMealLog = {
      ...(existingLog ?? {}),
      IdFoodItem: item.IdFoodItem,
      IdMealPlan: rawPlan.IdMealPlan,
      LogDate: selectedDate,
      ConsumedQty: item.consumedQty,
      IsConsumed: newIsConsumed,
      Notes: item.logNotes,
    };

    // optimistic update
    setLocalLogs(prev => new Map(prev).set(item.IdFoodItem!, newLog));

    // fire mutation
    setSavingIds(prev => new Set(prev).add(item.IdFoodItem!));
    logMutation.mutate(newLog, {
      onSettled: () => {
        setSavingIds(prev => {
          const n = new Set(prev);
          n.delete(item.IdFoodItem!);
          return n;
        });
      },
    });
  }, [rawPlan, selectedDate, localLogs, logMutation]);

  const handleQtyChange = useCallback((item: IMealFoodItemWithLog, qty: number) => {
    if (!rawPlan?.IdMealPlan || item.IdFoodItem == null) return;
    const existing = localLogs.get(item.IdFoodItem);
    if (!existing) return;
    const updated: IMealLog = { ...existing, ConsumedQty: qty };
    setLocalLogs(prev => new Map(prev).set(item.IdFoodItem!, updated));
    logMutation.mutate(updated);
  }, [rawPlan, selectedDate, localLogs, logMutation]);

  const handleNotesOpen = (item: IMealFoodItemWithLog) => {
    setNotesItem(item);
    setNotesText(item.logNotes ?? "");
  };

  const handleNotesSave = () => {
    if (!notesItem || !rawPlan?.IdMealPlan || notesItem.IdFoodItem == null) return;
    const existing = localLogs.get(notesItem.IdFoodItem);
    const updated: IMealLog = {
      ...(existing ?? {
        IdFoodItem: notesItem.IdFoodItem,
        IdMealPlan: rawPlan.IdMealPlan,
        LogDate: selectedDate,
        ConsumedQty: notesItem.consumedQty,
        IsConsumed: notesItem.isConsumed ? 1 : 0,
      }),
      Notes: notesText,
    };
    setLocalLogs(prev => new Map(prev).set(notesItem.IdFoodItem!, updated));
    logMutation.mutate(updated);
    toast.success("Note saved");
    setNotesItem(null);
  };

  // date navigation
  const today = moment().startOf("day");
  const isFuture = moment(selectedDate, "DD-MM-YYYY").isAfter(today, "day");

  const goDay = (delta: number) => {
    const next = moment(selectedDate, "DD-MM-YYYY").add(delta, "days");
    setSelectedDate(next.format("DD-MM-YYYY"));
    setLocalLogs(new Map());
  };

  const isLoading = planLoading || logsLoading;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* ── header ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-white" />
            <span className="text-lg font-bold text-white">Meal Plan</span>
          </div>
          {mergedPlan && (
            <AdherenceBadge pct={mergedPlan.overallAdherence} />
          )}
        </div>
        {/* date navigation */}
        <div className="flex items-center justify-between mt-3">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20" onClick={() => goDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={() => setCalendarOpen(o => !o)}
                className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-white/80 transition-colors"
              >
                <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                {fmtDate(selectedDate)}
                {selectedDate === moment().format("DD-MM-YYYY") && (
                  <Badge className="ml-1 text-[10px] h-4 bg-white/20 text-white border-0">Today</Badge>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="center">
              <Calendar
                mode="single"
                selected={moment(selectedDate, "DD-MM-YYYY").toDate()}
                onSelect={date => {
                  if (date) {
                    setSelectedDate(moment(date).format("DD-MM-YYYY"));
                    setLocalLogs(new Map());
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20" onClick={() => goDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {selectedDate !== moment().format("DD-MM-YYYY") && (
          <button
            onClick={() => { setSelectedDate(moment().format("DD-MM-YYYY")); setLocalLogs(new Map()); }}
            className="mt-1.5 w-full text-[11px] font-semibold text-white/70 hover:text-white flex items-center justify-center gap-1 py-1 transition-colors"
          >
            ↩ Jump to today
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28 bg-gray-50 dark:bg-gray-950 space-y-3">

        {/* loading */}
        {isLoading && (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        )}

        {/* no plan */}
        {!isLoading && !mergedPlan && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UtensilsCrossed className="h-14 w-14 text-gray-200 dark:text-gray-700 mb-3" />
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
              No meal plan for this day
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Your coach hasn't assigned a meal plan yet.
            </p>
          </div>
        )}

        {/* future date banner */}
        {isFuture && mergedPlan && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium">
            <span>📅</span>
            <span>You're viewing a future day — meal logging is disabled.</span>
          </div>
        )}

        {/* meal plan */}
        {!isLoading && mergedPlan && (
          <>
            {/* overall summary card */}
            <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {mergedPlan.PlanName}
                  </span>
                  <AdherenceBadge pct={mergedPlan.overallAdherence} />
                </div>
                <Progress value={mergedPlan.overallAdherence} className="h-2" />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-400">
                    {mergedPlan.mealsWithLogs.reduce((s, m) => s + m.completedCount, 0)} of{" "}
                    {mergedPlan.mealsWithLogs.reduce((s, m) => s + m.totalCount, 0)} foods consumed
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {mergedPlan.overallAdherence >= 80
                      ? "🏆 Great job!"
                      : mergedPlan.overallAdherence >= 50
                      ? "💪 Keep going!"
                      : "🎯 Let's start eating!"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* meal sections */}
            {MEAL_TYPES.map(mealType => {
              const meal = mergedPlan.mealsWithLogs.find(m => m.MealType === mealType);
              if (!meal || meal.totalCount === 0) return null;
              return (
                <MealSection
                  key={mealType}
                  mealType={mealType}
                  items={meal.foodItemsWithLogs}
                  completedCount={meal.completedCount}
                  totalCount={meal.totalCount}
                  completionPercent={meal.completionPercent}
                  savingIds={savingIds}
                  readOnly={isFuture}
                  onToggle={handleToggle}
                  onQtyChange={handleQtyChange}
                  onNotesClick={handleNotesOpen}
                />
              );
            })}

            {/* notes tip */}
            <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 pb-2">
              Tap a food's{" "}
              <MessageSquare className="h-3 w-3 inline" />{" "}
              to add a skip reason or substitution note.
            </p>
          </>
        )}

      </main>

      <MobileNav />

      {/* ── Floating chat FAB ─────────────────────────────────────── */}
      {mergedPlan && <button
        onClick={() => setQaOpen(o => !o)}
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
      >
        <MessageCircle className="h-6 w-6 text-white" />
        {myQueries.filter(q => !q.Answer).length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {myQueries.filter(q => !q.Answer).length}
          </span>
        )}
      </button>}

      {/* ── Ask Coach slide-up drawer ─────────────────────────────── */}
      {qaOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setQaOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[50vh] min-h-[200px] overflow-hidden">
            {/* drawer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ask Your Coach</span>
                {myQueries.filter(q => !q.Answer).length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {myQueries.filter(q => !q.Answer).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); refetchQueries(); }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${queriesFetching ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setQaOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* thread */}
            <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-3">
              {myQueries.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No questions yet for this day.</p>
              ) : (
                myQueries.map(q => (
                  <div key={q.IdQuery} className="space-y-1.5">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-blue-600 text-white text-sm px-3 py-2 rounded-2xl rounded-tr-sm">
                        {q.Question}
                        <p className="text-[10px] opacity-60 mt-0.5 text-right">
                          {q.CreatedAt ? moment(q.CreatedAt).format("MMM D, h:mm a") : ""}
                        </p>
                      </div>
                    </div>
                    {q.Answer ? (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm px-3 py-2 rounded-2xl rounded-tl-sm">
                          {q.Answer}
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {q.AnsweredAt ? moment(q.AnsweredAt).format("MMM D, h:mm a") : ""}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <span className="text-[11px] text-gray-400 italic px-1">Waiting for coach reply…</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            {/* ask input pinned at bottom */}
            <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 px-3 pt-2 pb-1">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-snug mb-2">
                Use this for doubts about your meal plan only. To log a skip or substitution, tap the <MessageSquare className="inline h-3 w-3 mx-0.5" /> icon next to the meal item.
              </p>
            </div>
            <div className="flex-shrink-0 px-3 pb-3 flex gap-2">
                <textarea
                  className="flex-1 min-h-[60px] max-h-[100px] p-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-blue-300 outline-none"
                  placeholder="Ask your coach about this meal plan…"
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                />
                <button
                  disabled={!questionText.trim() || askMutation.isPending}
                  onClick={() => askMutation.mutate(questionText)}
                  className="self-center flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors flex-shrink-0"
                >
                  {askMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                </button>
              </div>
          </div>
        </>
      )}

      {/* ── Notes Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!notesItem} onOpenChange={() => setNotesItem(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Food Note</DialogTitle>
            <DialogDescription>
              {notesItem?.FoodName} — {notesItem?.PlannedQty} {notesItem?.Unit}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <textarea
              className="w-full min-h-[100px] p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-primary-300 outline-none"
              placeholder="e.g. Skipped — wasn't hungry. Substituted with Greek yogurt."
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {["Skipped", "Ate less", "Substituted", "Had extra"].map(tag => (
                <button
                  key={tag}
                  onClick={() => setNotesText(p => p ? `${p}, ${tag}` : tag)}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNotesItem(null)}>Cancel</Button>
            <Button size="sm" onClick={handleNotesSave}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
