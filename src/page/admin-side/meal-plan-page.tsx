"use client";

import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, Trash2, Pencil, Copy, Check, X, ChevronDown, ChevronUp,
  GripVertical, Save, CalendarDays, User, UtensilsCrossed, AlertCircle,
  Search, Eye, Edit3, ShoppingBasket, ChevronLeft, ChevronRight,
  Settings2, Flame, Repeat2, HelpCircle, Send, MessageCircle, RefreshCw,
} from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";

import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { useLocation } from "wouter";
import { AdminPageHeader } from "../../components/layout/page-header";
import { useAuth } from "../../hooks/use-auth";
import { queryClient } from "../../lib/queryClient";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { getUserListForACoach } from "../../services/AdminServices";
import { getFoodBasedOnCatergoryApi } from "../../services/FoodService";
import {
  getMealPlansForClient, createMealPlan, updateMealPlan,
  deleteMealPlan, copyMealPlan, getMealLogsForClient,
  getExtraFoodLogsForClient,
} from "../../services/MealPlanService";
import {
  IMealQuery, getMealQueriesForClient, replyMealQuery,
} from "../../services/MealQueryService";
import {
  IMealPlan, IMealFoodItem, IMealLog, MealType,
  MEAL_TYPES, MEAL_META, COMMON_UNITS, createBlankPlan, IExtraFoodLog,
} from "../../interface/IMealPlan";
import { IUser } from "../../interface/models/User";
import { IFoodCatergory, IFoodAlternative } from "../../interface/IFoodAlternative";

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

const todayStr = () => moment().format("DD-MM-YYYY");

function dateInputToFmt(v: string) {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
}
function fmtToDateInput(v: string) {
  if (!v) return "";
  const [d, m, y] = v.split("-");
  return `${y}-${m}-${d}`;
}

type CartEntry = { food: IFoodAlternative; qty: string; unit: string };
type CategoryFilter = "All" | "Protein" | "Carbs" | "Fat";

const CAT_COLOR: Record<string, string> = {
  Protein: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  Carbs:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Fat:     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

// ─────────────────────────────────────────────────────────────────
// FoodBrowserDialog — multi-select from DB with inline qty edit
// ─────────────────────────────────────────────────────────────────

interface FoodBrowserDialogProps {
  open: boolean;
  mealType: MealType | null;
  foodDb: IFoodAlternative[];
  foodDbLoading: boolean;
  foodDbError: boolean;
  onClose: () => void;
  onConfirm: (mealType: MealType, items: Omit<IMealFoodItem, "IdFoodItem" | "IdMeal">[]) => void;
}

function FoodBrowserDialog({ open, mealType, foodDb, foodDbLoading, foodDbError, onClose, onConfirm }: FoodBrowserDialogProps) {
  const [cart,   setCart]   = useState<Map<string, CartEntry>>(new Map());
  const [query,  setQuery]  = useState("");
  const [catFilter, setCatFilter] = useState<CategoryFilter>("All");
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setCart(new Map());
      setQuery("");
      setCatFilter("All");
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [open]);

  if (!mealType) return null;
  const meta = MEAL_META[mealType];

  // Filter food list — search across name AND notes/benefits for better matching
  const filtered = foodDb.filter(f => {
    const q = query.trim().toLowerCase();
    const matchSearch = !q
      || f.name.toLowerCase().includes(q)
      || (f.note ?? "").toLowerCase().includes(q)
      || (f.benefits ?? []).some(b => b.toLowerCase().includes(q));
    const matchCat = catFilter === "All" || f.category === catFilter;
    return matchSearch && matchCat;
  });

  // Cart helpers
  const toggleFood = (food: IFoodAlternative) => {
    setCart(prev => {
      const next = new Map(prev);
      if (next.has(food.name)) {
        next.delete(food.name);
      } else {
        const qtyNum = parseFloat(food.quantity ?? "");
        const unitMatch = (food.quantity ?? "").match(/[a-zA-Z]+/);
        next.set(food.name, {
          food,
          qty: isNaN(qtyNum) ? "100" : String(qtyNum),
          unit: unitMatch ? unitMatch[0] : "g",
        });
      }
      return next;
    });
  };

  const updateQty  = (name: string, qty: string)  =>
    setCart(prev => { const n = new Map(prev); const e = n.get(name); if (e) n.set(name, { ...e, qty });  return n; });
  const updateUnit = (name: string, unit: string) =>
    setCart(prev => { const n = new Map(prev); const e = n.get(name); if (e) n.set(name, { ...e, unit }); return n; });

  const handleConfirm = () => {
    if (cart.size === 0) { toast.error("Select at least one food"); return; }
    const items: Omit<IMealFoodItem, "IdFoodItem" | "IdMeal">[] = Array.from(cart.values()).map((e, idx) => ({
      FoodName:        e.food.name,
      PlannedQty:      Math.max(0.01, parseFloat(e.qty) || 100),
      Unit:            e.unit,
      SortOrder:       idx + 1,
      Category:        e.food.category,
      CaloriesPer100g: e.food.calories,
      ProteinPer100g:  e.food.protein,
      CarbsPer100g:    e.food.carbs,
      FatPer100g:      e.food.fat,
    }));
    onConfirm(mealType, items);
  };

  const cartCount = cart.size;

  // Shared renderer for a food row (used both in pinned-selected section and in filtered list)
  const renderFoodRow = (food: IFoodAlternative, entry?: CartEntry) => {
    const inCart = cart.has(food.name);
    return (
      <div
        key={food.name}
        className={`rounded-xl border transition-all duration-150 ${
          inCart
            ? "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30"
            : "border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 hover:border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            onClick={() => toggleFood(food)}
            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              inCart
                ? "bg-orange-600 border-orange-600"
                : "border-gray-300 dark:border-gray-600 hover:border-orange-400"
            }`}
          >
            {inCart && <Check className="h-3.5 w-3.5 text-white" />}
          </button>
          <div className="flex-1 min-w-0" onClick={() => toggleFood(food)}>
            <p className={`text-sm font-semibold truncate cursor-pointer ${
              inCart ? "text-orange-800 dark:text-orange-200" : "text-gray-800 dark:text-gray-200"
            }`}>
              {food.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${CAT_COLOR[food.category ?? "Protein"]}`}>
                {food.category}
              </span>
              <span className="text-[10px] text-gray-400">
                {food.calories} kcal · P:{food.protein}g · C:{food.carbs}g · F:{food.fat}g
              </span>
            </div>
          </div>
          {!inCart ? (
            <button
              onClick={() => toggleFood(food)}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center hover:bg-orange-200 transition-colors"
            >
              <Plus className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </button>
          ) : (
            <button
              onClick={() => toggleFood(food)}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center hover:bg-red-200 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-red-500" />
            </button>
          )}
        </div>
        {inCart && entry && (
          <div className="flex items-center gap-2 px-3 pb-2.5 pt-0">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">Quantity:</span>
            <Input
              type="number"
              value={entry.qty}
              onChange={e => updateQty(food.name, e.target.value)}
              onClick={e => e.stopPropagation()}
              min="0"
              step="any"
              className="w-20 h-7 text-sm text-center px-1 bg-white dark:bg-gray-800 border-orange-200 dark:border-orange-700"
            />
            <select
              value={entry.unit}
              onChange={e => updateUnit(food.name, e.target.value)}
              onClick={e => e.stopPropagation()}
              className="flex-1 h-7 rounded-md border border-orange-200 dark:border-orange-700 bg-white dark:bg-gray-800 text-xs px-1.5 text-gray-900 dark:text-gray-100"
            >
              {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 flex flex-col gap-0 sm:max-w-lg w-full max-h-[92vh] overflow-hidden rounded-2xl">

        {/* ── sticky header ──────────────────────────────────────── */}
        <div className={`px-4 pt-4 pb-3 ${meta.headerBg} border-b ${meta.borderColor}`}>
          <DialogHeader className="mb-2 p-0">
            <DialogTitle className="flex items-center gap-2 text-base pr-8">
              <span className="text-xl">{meta.emoji}</span>
              Add foods to <span className={`font-bold ${meta.badgeText}`}>{meta.label}</span>
              {cartCount > 0 && (
                <span className="ml-auto flex-shrink-0 bg-orange-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {cartCount} selected
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search foods…"
              className="pl-9 h-9 bg-white dark:bg-gray-800 text-sm"
            />
            {query && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setQuery("")}>
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {/* category pills */}
          <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5 scrollbar-none">
            {(["All", "Protein", "Carbs", "Fat"] as CategoryFilter[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  catFilter === cat
                    ? "bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 shadow"
                    : cat === "All"
                    ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    : CAT_COLOR[cat]
                }`}
              >
                {cat === "All" ? "All foods" : cat}
                {cat !== "All" && (
                  <span className="ml-1 opacity-70">
                    ({foodDb.filter(f => f.category === cat).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── food list ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 bg-gray-50 dark:bg-gray-950">
          {foodDbLoading && (
            <div className="text-center py-10 text-sm text-gray-400">Loading food database…</div>
          )}
          {!foodDbLoading && foodDbError && (
            <div className="text-center py-10 text-sm text-red-400">Could not load food database. Check your connection.</div>
          )}
          {!foodDbLoading && !foodDbError && foodDb.length === 0 && (
            <div className="text-center py-10 text-sm text-gray-400">
              No foods in the database yet.{" "}
              <span className="text-blue-500">Add foods via the NutriSwap page first.</span>
            </div>
          )}

          {/* ── selected foods pinned at top (always visible regardless of search) ── */}
          {cartCount > 0 && (
            <>
              <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide px-1 pt-1 pb-1.5">
                ✓ Selected ({cartCount}) — search more to add
              </p>
              {Array.from(cart.values()).map(entry => renderFoodRow(entry.food, entry))}
              {filtered.some(f => !cart.has(f.name)) && (
                <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-1" />
              )}
            </>
          )}

          {/* ── search results (exclude already-selected items to avoid duplicates) ── */}
          {!foodDbLoading && !foodDbError && foodDb.length > 0 && filtered.filter(f => !cart.has(f.name)).length === 0 && cartCount === 0 && (
            <div className="text-center py-10 text-sm text-gray-400">
              No foods match <strong>"{query}"</strong>
              {catFilter !== "All" && <> in <strong>{catFilter}</strong> — try <button className="text-blue-500 underline" onClick={() => setCatFilter("All")}>All categories</button></>}.
            </div>
          )}

          {filtered.filter(f => !cart.has(f.name)).map(food => renderFoodRow(food))}
        </div>

        {/* ── sticky footer ───────────────────────────────────────── */}
        <div className={`border-t px-4 py-3 bg-white dark:bg-gray-900 ${meta.borderColor}`}>
          {cartCount > 0 && (
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <ShoppingBasket className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                {cartCount} food{cartCount !== 1 ? "s" : ""} selected:
              </span>
              {Array.from(cart.values()).map(e => (
                <span
                  key={e.food.name}
                  className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full"
                >
                  {e.food.name} · {e.qty} {e.unit}
                </span>
              ))}
            </div>
          )}

          <DialogFooter className="flex-row gap-2 sm:justify-between p-0">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-[2]"
              onClick={handleConfirm}
              disabled={cartCount === 0}
            >
              <Check className="h-4 w-4 mr-1.5" />
              Add {cartCount > 0 ? `${cartCount} food${cartCount !== 1 ? "s" : ""}` : "foods"} to {meta.label}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// FoodItemForm — custom-only (used for editing / manual add)
// ─────────────────────────────────────────────────────────────────

interface FoodItemFormProps {
  initial?: IMealFoodItem;
  onSave: (item: Omit<IMealFoodItem, "IdFoodItem" | "IdMeal">) => void;
  onCancel: () => void;
  onDataChange?: (hasData: boolean) => void;
}
interface FoodItemFormHandle { submit: () => void; }

const FoodItemForm = forwardRef<FoodItemFormHandle, FoodItemFormProps>(
  function FoodItemForm({ initial, onSave, onCancel, onDataChange }, ref) {
    const [name, setName] = useState(initial?.FoodName ?? "");
    const [qty,  setQty]  = useState<string>(initial?.PlannedQty?.toString() ?? "");
    const [unit, setUnit] = useState(initial?.Unit ?? "g");
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => { nameRef.current?.focus(); }, []);

    useEffect(() => {
      onDataChange?.(name.trim().length > 0 || qty.length > 0);
    }, [name, qty]);

    const doSave = () => {
      if (!name.trim()) { toast.error("Food name is required"); return; }
      const parsed = parseFloat(qty);
      if (isNaN(parsed) || parsed <= 0) { toast.error("Enter a valid quantity"); return; }
      onSave({ FoodName: name.trim(), PlannedQty: parsed, Unit: unit, SortOrder: initial?.SortOrder ?? 0, Notes: initial?.Notes });
    };

    useImperativeHandle(ref, () => ({ submit: doSave }));

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); doSave(); };

    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800"
      >
        <Input
          ref={nameRef}
          placeholder="Food name (e.g. Oats, Egg white…)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-8 text-sm bg-white dark:bg-gray-800"
        />
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Qty"
            value={qty}
            onChange={e => setQty(e.target.value)}
            min="0"
            step="any"
            className="w-20 h-8 text-sm bg-white dark:bg-gray-800"
          />
          <select
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="flex-1 h-8 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-2 text-gray-900 dark:text-gray-100"
          >
            {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <Button type="submit" size="sm" className="h-8 px-3 flex-shrink-0">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8 px-2 flex-shrink-0" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    );
  }
);

// ─────────────────────────────────────────────────────────────────
// Macro helper
// ─────────────────────────────────────────────────────────────────

function computeMacros(items: IMealFoodItem[]) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  items.forEach(f => {
    const factor = (f.PlannedQty ?? 0) / 100;
    kcal    += (f.CaloriesPer100g ?? 0) * factor;
    protein += (f.ProteinPer100g  ?? 0) * factor;
    carbs   += (f.CarbsPer100g    ?? 0) * factor;
    fat     += (f.FatPer100g      ?? 0) * factor;
  });
  return {
    kcal:    Math.round(kcal),
    protein: Math.round(protein),
    carbs:   Math.round(carbs),
    fat:     Math.round(fat),
  };
}

// ─────────────────────────────────────────────────────────────────
// FoodItemRow — shows planned qty + optional client log badge
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// MealCard — single meal in the new design
// ─────────────────────────────────────────────────────────────────

const MEAL_ACCENT: Record<MealType, { border: string; bg: string; btn: string; dot: string }> = {
  Breakfast: { border: "border-l-amber-400",  bg: "bg-amber-50",   btn: "bg-amber-500 hover:bg-amber-600",   dot: "bg-amber-400"  },
  Lunch:     { border: "border-l-green-400",  bg: "bg-green-50",   btn: "bg-green-500 hover:bg-green-600",   dot: "bg-green-400"  },
  Snack:     { border: "border-l-purple-400", bg: "bg-purple-50",  btn: "bg-purple-500 hover:bg-purple-600", dot: "bg-purple-400" },
  Dinner:    { border: "border-l-blue-400",   bg: "bg-blue-50",    btn: "bg-blue-500 hover:bg-blue-600",     dot: "bg-blue-400"   },
};

interface MealCardProps {
  mealType: MealType;
  foodItems: IMealFoodItem[];
  logs: IMealLog[];
  viewMode: boolean;
  onBrowse: () => void;
  onAddManual: (item: Omit<IMealFoodItem, "IdFoodItem" | "IdMeal">) => void;
  onEditFood:  (sortOrder: number, item: Omit<IMealFoodItem, "IdFoodItem" | "IdMeal">) => void;
  onDeleteFood:(sortOrder: number) => void;
}

function MealCard({ mealType, foodItems, logs, viewMode, onBrowse, onAddManual, onEditFood, onDeleteFood }: MealCardProps) {
  const meta   = MEAL_META[mealType];
  const accent = MEAL_ACCENT[mealType];
  const [showManual,     setShowManual]     = useState(false);
  const [editingSO,      setEditingSO]      = useState<number | null>(null);
  const [manualHasData,  setManualHasData]  = useState(false);
  const [browseConflict, setBrowseConflict] = useState(false);
  const manualFormRef = useRef<FoodItemFormHandle>(null);

  const handleBrowseClick = () => {
    if (showManual && manualHasData) {
      setBrowseConflict(true);
      return;
    }
    setShowManual(false);
    setBrowseConflict(false);
    onBrowse();
  };

  const logMap      = new Map(logs.map(l => [l.IdFoodItem, l]));
  const macros      = computeMacros(foodItems);
  const consumedCnt = foodItems.filter(f => f.IdFoodItem != null && logMap.get(f.IdFoodItem)?.IsConsumed === 1).length;
  const hasLogs     = logs.length > 0 && foodItems.length > 0;

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${accent.border} shadow-sm overflow-hidden`}>

      {/* ── card header ── */}
      <div className={`${accent.bg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">{meta.emoji}</span>
          <div>
            <p className="text-sm font-bold text-gray-800">{meta.label}</p>
            <p className="text-[11px] text-gray-500 leading-none mt-0.5">
              {foodItems.length === 0
                ? "No foods added"
                : `${foodItems.length} food${foodItems.length !== 1 ? "s" : ""}${macros.kcal > 0 ? `  ·  ${macros.kcal} kcal` : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasLogs && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              consumedCnt === foodItems.length ? "bg-green-100 text-green-700"
              : consumedCnt > 0 ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
            }`}>
              {consumedCnt}/{foodItems.length} eaten
            </span>
          )}
          {!viewMode && (
            <button
              onClick={handleBrowseClick}
              className={`flex items-center gap-1 text-[11px] font-bold text-white px-3 py-1.5 rounded-full transition-colors ${accent.btn}`}
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
        </div>
      </div>

      {/* ── food list ── */}
      {(foodItems.length > 0 || showManual) && (
        <div className="divide-y divide-gray-50">
          {foodItems.map(item => {
            const log  = item.IdFoodItem != null ? logMap.get(item.IdFoodItem) : undefined;
            const eaten = log?.IsConsumed === 1;
            const kcal  = item.CaloriesPer100g ? Math.round(item.CaloriesPer100g * item.PlannedQty / 100) : null;

            if (editingSO === item.SortOrder) {
              return (
                <div key={item.SortOrder} className="px-4 py-2">
                  <FoodItemForm
                    initial={item}
                    onSave={edited => { onEditFood(item.SortOrder, edited); setEditingSO(null); }}
                    onCancel={() => setEditingSO(null)}
                  />
                </div>
              );
            }

            return (
              <div key={item.SortOrder} className={`flex items-center gap-3 px-4 py-2.5 ${eaten ? "bg-green-50/60" : log ? "bg-red-50/40" : ""}`}>
                {/* status dot */}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${eaten ? "bg-green-400" : log ? "bg-red-400" : accent.dot}`} />

                {/* name + qty */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.FoodName}</p>
                  <p className="text-[10px] text-gray-400 leading-none">
                    {item.PlannedQty} {item.Unit}
                    {kcal ? `  ·  ${kcal} kcal` : ""}
                    {item.Category && <span className="ml-1.5 opacity-60">{item.Category}</span>}
                  </p>
                </div>

                {/* eaten badge */}
                {log && (
                  <span className={`text-[10px] font-semibold flex-shrink-0 ${eaten ? "text-green-600" : "text-red-400"}`}>
                    {eaten ? "✓" : "✗"}
                  </span>
                )}

                {/* edit / delete */}
                {!viewMode && (
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button onClick={() => setEditingSO(item.SortOrder)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => onDeleteFood(item.SortOrder)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* manual add form */}
          {showManual && (
            <div className="px-4 py-3 space-y-2">
              {/* conflict banner — shown when user clicks Add while form has data */}
              {browseConflict && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
                  <span className="text-amber-500 text-base leading-none mt-0.5">⚠</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-800">You have an unsaved custom entry</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">Save it first or clear it to open the food browser.</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => { manualFormRef.current?.submit(); setBrowseConflict(false); }}
                        className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors"
                      >
                        Save it
                      </button>
                      <button
                        onClick={() => { setShowManual(false); setManualHasData(false); setBrowseConflict(false); onBrowse(); }}
                        className="px-3 py-1 rounded-lg border border-amber-300 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                      >
                        Clear &amp; Browse
                      </button>
                      <button
                        onClick={() => setBrowseConflict(false)}
                        className="ml-auto px-2 py-1 text-amber-400 text-xs hover:text-amber-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <FoodItemForm
                ref={manualFormRef}
                onSave={item => { onAddManual(item); setShowManual(false); setManualHasData(false); setBrowseConflict(false); }}
                onCancel={() => { setShowManual(false); setManualHasData(false); setBrowseConflict(false); }}
                onDataChange={setManualHasData}
              />
            </div>
          )}
        </div>
      )}

      {/* ── empty state / custom add ── */}
      {!viewMode && (
        <div className={`px-4 py-3 flex items-center gap-2 ${foodItems.length > 0 ? "border-t border-gray-50" : ""}`}>
          {foodItems.length === 0 && !showManual ? (
            <>
              <button onClick={handleBrowseClick}
                className="flex-1 h-9 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 font-medium hover:border-gray-300 hover:text-gray-500 transition-colors flex items-center justify-center gap-1">
                <Search className="h-3.5 w-3.5" /> Browse foods
              </button>
              <button onClick={() => setShowManual(true)}
                className="h-9 px-3 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 font-medium hover:border-gray-300 hover:text-gray-500 transition-colors">
                + Custom
              </button>
            </>
          ) : !showManual ? (
            <button onClick={() => setShowManual(true)}
              className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 py-0.5 transition-colors">
              <Plus className="h-3 w-3" /> Add custom food
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ExtraFoodAdminCard — read-only view of food the client logged
// outside their assigned plan, including any photos they attached
// ─────────────────────────────────────────────────────────────────
function ExtraFoodAdminCard({ logs, onImageClick }: { logs: IExtraFoodLog[]; onImageClick: (url: string) => void }) {
  if (logs.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-purple-200 bg-white">
      <div className="w-full flex items-center gap-2 px-4 py-3 bg-purple-50">
        <span className="text-base">🍟</span>
        <span className="font-semibold text-sm text-gray-800">Additional Food (logged by client)</span>
        <Badge className="text-[10px] h-5 bg-purple-100 text-purple-700 border-0">{logs.length}</Badge>
      </div>
      <div className="p-3 space-y-2">
        {logs.map(log => {
          const images = log.ImageFileNames
            ? log.ImageFileNames.split(',').map(f => f.trim()).filter(Boolean)
            : [];
          return (
            <div key={log.IdExtraFoodLog} className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
              <p className="text-sm font-medium text-gray-800">
                {log.FoodName}
                {log.Quantity && <span className="text-xs font-normal text-gray-400 ml-1.5">({log.Quantity})</span>}
              </p>
              {log.Notes && <p className="text-xs text-gray-500 mt-0.5">{log.Notes}</p>}
              {images.length > 0 && (
                <div className="flex gap-1.5 mt-2 overflow-x-auto">
                  {images.map((file, i) => {
                    const url = `${BASE_URL}/uploads/extrafood/${file}`;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onImageClick(url)}
                        className="flex-shrink-0"
                      >
                        <img
                          src={url}
                          alt={`${log.FoodName} photo ${i + 1}`}
                          className="h-16 w-16 rounded-lg object-cover border border-purple-100 hover:opacity-80 transition-opacity cursor-zoom-in"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Plan dirty-check helper — only compares user-editable fields
// ─────────────────────────────────────────────────────────────────
function planSnapshot(p: IMealPlan): string {
  return JSON.stringify({
    PlanName: p.PlanName,
    Notes:    p.Notes ?? "",
    EndDate:  p.EndDate ?? "",
    Meals: MEAL_TYPES.map(mt => {
      const meal = p.Meals.find(m => m.MealType === mt);
      return {
        MealType: mt,
        FoodItems: (meal?.FoodItems ?? []).map(f => ({
          FoodName:   f.FoodName,
          PlannedQty: f.PlannedQty,
          Unit:       f.Unit,
          SortOrder:  f.SortOrder,
        })),
      };
    }),
  });
}

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────

export default function AdminMealPlanPage() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedDate,   setSelectedDate]   = useState<string>(todayStr());
  const [plan,      setPlan]      = useState<IMealPlan | null>(null);
  const [isNewPlan, setIsNewPlan] = useState(true);
  const [viewMode,  setViewMode]  = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [extraFoodPreviewImage, setExtraFoodPreviewImage] = useState<string | null>(null);

  // food browser dialog
  const [browserMeal, setBrowserMeal] = useState<MealType | null>(null);

  // copy dialog
  const [copyOpen,         setCopyOpen]         = useState(false);
  const [copyTargetDate,   setCopyTargetDate]   = useState<string>(todayStr());
  const [copyTargetUserId, setCopyTargetUserId] = useState<number | null>(null);

  // delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);

  // snapshot of the last-saved plan for dirty detection
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  // date calendar popover
  const [calendarOpen, setCalendarOpen] = useState(false);

  // range-plan save scope dialog
  const [saveRangeOpen, setSaveRangeOpen] = useState(false);
  const [isRangePlan,   setIsRangePlan]   = useState(false);

  useEffect(() => { setBaseUrl(BASE_URL); }, []);

  // ── food database ─────────────────────────────────────────────
  const { data: foodCategoryData, isLoading: foodDbLoading, isError: foodDbError } = useQuery<IFoodCatergory>({
    queryKey: ["foodcatergory_list"],
    queryFn: () => getFoodBasedOnCatergoryApi(null).then((res: unknown) => {
      const r = res as { data: { data: unknown } };
      return r?.data?.data as IFoodCatergory;
    }),
    staleTime: Infinity,
  });

  const allFoods: IFoodAlternative[] = React.useMemo(() => {
    if (!foodCategoryData) return [];
    if (Array.isArray(foodCategoryData)) {
      const CAT_MAP: Record<string, string> = { protein:"Protein",Protein:"Protein",carbs:"Carbs",Carbs:"Carbs",fat:"Fat",Fat:"Fat" };
      return (foodCategoryData as unknown as IFoodAlternative[]).map(f => ({ ...f, category: CAT_MAP[f.category ?? ""] ?? f.category ?? "Protein" }));
    }
    const d = foodCategoryData as unknown as Record<string, IFoodAlternative[]>;
    return [
      ...(d.Protein ?? d.protein ?? []).map(f => ({ ...f, category: "Protein" as const })),
      ...(d.Carbs   ?? d.carbs   ?? []).map(f => ({ ...f, category: "Carbs"   as const })),
      ...(d.Fat     ?? d.fat     ?? []).map(f => ({ ...f, category: "Fat"     as const })),
    ];
  }, [foodCategoryData]);

  // ── client list ───────────────────────────────────────────────
  const { data: clientList = [] } = useQuery<IUser[]>({
    queryKey: ["coach-userlist-mealplan", user?.info?.EmailID],
    queryFn: () => getUserListForACoach(null).then((res: unknown) => {
      const r = res as { data: { data: IUser[] } };
      return r.data.data ?? [];
    }),
  });

  // ── TEST: default to Devu Mani ───────────────────────────────
  useEffect(() => {
    if (clientList.length > 0 && selectedUserId === null) {
      const devu = clientList.find(c =>
        `${c.FirstName} ${c.LastName}`.toLowerCase().includes("devu")
      );
      if (devu?.IdUser) { setSelectedUserId(devu.IdUser); setCopyTargetUserId(devu.IdUser); }
    }
  }, [clientList]);

  // ── plan for selected client + date ──────────────────────────
  const { data: fetchedPlan, isLoading: planLoading } = useQuery({
    queryKey: ["meal-plan-admin", selectedUserId, selectedDate],
    enabled: !!selectedUserId && !!selectedDate,
    queryFn: async () => {
      const res = await getMealPlansForClient({ IdUser: selectedUserId!, AssignedDate: selectedDate }) as { data: { data: IMealPlan[] } };
      const plans = res.data?.data ?? [];
      return plans.length > 0 ? plans[0] : null;
    },
  });

  // ── client food logs ──────────────────────────────────────────
  const { data: clientLogs = [] } = useQuery<IMealLog[]>({
    queryKey: ["client-meal-logs-admin", selectedUserId, selectedDate],
    enabled: !!selectedUserId && !!selectedDate,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await getMealLogsForClient({ IdUser: selectedUserId!, LogDate: selectedDate }) as { data: { data: IMealLog[] } };
      return res.data?.data ?? [];
    },
  });

  const logMap = React.useMemo(
    () => new Map<number, IMealLog>(clientLogs.map(l => [l.IdFoodItem, l])),
    [clientLogs]
  );

  // ── client extra food logs (unplanned food eaten outside the diet) ──
  const { data: clientExtraFoodLogs = [] } = useQuery<IExtraFoodLog[]>({
    queryKey: ["client-extra-food-logs-admin", selectedUserId, selectedDate],
    enabled: !!selectedUserId && !!selectedDate,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await getExtraFoodLogsForClient({ IdUser: selectedUserId!, LogDate: selectedDate }) as { data: { data: IExtraFoodLog[] } };
      return res.data?.data ?? [];
    },
  });

  const adherence = React.useMemo(() => {
    if (!plan) return null;
    const all = plan.Meals.flatMap(m => m.FoodItems);
    if (all.length === 0) return null;
    const consumed = all.filter(f => f.IdFoodItem != null && logMap.get(f.IdFoodItem)?.IsConsumed === 1).length;
    return { consumed, total: all.length, pct: Math.round((consumed / all.length) * 100) };
  }, [plan, logMap]);

  const planMacros = React.useMemo(() => plan ? computeMacros(plan.Meals.flatMap(m => m.FoodItems)) : null, [plan]);

  // ── client queries ────────────────────────────────────────────
  const { data: clientQueries = [], refetch: refetchQueries, isFetching: queriesFetching } = useQuery<IMealQuery[]>({
    queryKey: ["client-meal-queries", selectedUserId, selectedDate],
    enabled: !!selectedUserId && !!selectedDate,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    queryFn: async () => {
      const res = await getMealQueriesForClient({ IdUser: selectedUserId!, QueryDate: selectedDate }) as any;
      const d = res.data?.data;
      return Array.isArray(d) ? d : [];
    },
  });

  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [qaOpen, setQaOpen] = useState(false);

  const replyMutation = useMutation({
    mutationFn: (params: { IdQuery: number; Answer: string }) => replyMealQuery(params),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["client-meal-queries", selectedUserId, selectedDate] });
      setReplyText(prev => { const n = { ...prev }; delete n[vars.IdQuery]; return n; });
      toast.success("Reply sent");
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  // ── sync fetched plan ─────────────────────────────────────────
  useEffect(() => {
    autoSwitchedRef.current = false;
    if (!selectedUserId || !selectedDate) { setPlan(null); return; }
    if (fetchedPlan) {
      const meals = MEAL_TYPES.map(mt => fetchedPlan.Meals?.find(m => m.MealType === mt) ?? { MealType: mt, FoodItems: [] });
      const loaded = { ...fetchedPlan, Meals: meals };
      setPlan(loaded);
      setSavedSnapshot(planSnapshot(loaded));
      setIsNewPlan(false);
      setViewMode(clientLogs.length > 0);
      // True when this date is covered by a range plan, not directly assigned to it
      setIsRangePlan(fetchedPlan.AssignedDate !== selectedDate);
    } else {
      setPlan(createBlankPlan(selectedUserId, selectedDate));
      setSavedSnapshot(null);
      setIsNewPlan(true);
      setIsRangePlan(false);
      setViewMode(false);
    }
  }, [fetchedPlan, selectedUserId, selectedDate]);

  // Auto-switch to progress view on initial load when logs exist (only on first fetch, not every change)
  const autoSwitchedRef = useRef(false);
  useEffect(() => {
    if (!autoSwitchedRef.current && clientLogs.length > 0) {
      autoSwitchedRef.current = true;
      setViewMode(true);
    }
  }, [clientLogs]);

  // ── mutations ─────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (p: IMealPlan) => isNewPlan ? createMealPlan(p) : updateMealPlan(p),
    onSuccess: (_, savedPlan) => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan-admin", selectedUserId] });
      toast.success(isNewPlan ? "Meal plan created!" : "Meal plan updated!");
      setSavedSnapshot(planSnapshot(savedPlan));
      setIsNewPlan(false);
      setSaveRangeOpen(false);
      setSettingsOpen(false);
    },
    onError: (e: Error) => toast.error(`Failed to save: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMealPlan({ IdMealPlan: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan-admin", selectedUserId, selectedDate] });
      setDeleteOpen(false);
      toast.success("Meal plan deleted");
    },
    onError: (e: Error) => toast.error(`Failed to delete: ${e.message}`),
  });

  const copyMutation = useMutation({
    mutationFn: () => copyMealPlan({ IdMealPlan: plan!.IdMealPlan!, TargetDate: copyTargetDate, IdUser: copyTargetUserId ?? selectedUserId! }),
    onSuccess: () => {
      const targetUserId = copyTargetUserId ?? selectedUserId!;
      // Invalidate all date queries for the target user so navigating to any copied date shows fresh data
      queryClient.invalidateQueries({ queryKey: ["meal-plan-admin", targetUserId] });
      setCopyOpen(false);
      toast.success("Plan copied!");
    },
    onError: (e: Error) => toast.error(`Failed to copy: ${e.message}`),
  });

  const createSingleDayMutation = useMutation({
    mutationFn: (p: IMealPlan) => createMealPlan(p),
    onSuccess: (_, savedPlan) => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan-admin", selectedUserId, selectedDate] });
      toast.success("Plan created for this day only!");
      setSavedSnapshot(planSnapshot(savedPlan));
      setIsNewPlan(false);
      setIsRangePlan(false);
      setSaveRangeOpen(false);
      setSettingsOpen(false);
    },
    onError: (e: Error) => toast.error(`Failed to save: ${e.message}`),
  });

  // ── plan editing helpers ──────────────────────────────────────
  const updateMealFoods = (mt: MealType, fn: (items: IMealFoodItem[]) => IMealFoodItem[]) =>
    setPlan(prev => prev ? { ...prev, Meals: prev.Meals.map(m => m.MealType === mt ? { ...m, FoodItems: fn(m.FoodItems) } : m) } : prev);

  const handleBrowseConfirm = (mt: MealType, newItems: Omit<IMealFoodItem, "IdFoodItem" | "IdMeal">[]) => {
    updateMealFoods(mt, existing => {
      const base = existing.length;
      return [...existing, ...newItems.map((item, idx) => ({ ...item, SortOrder: base + idx + 1 }))];
    });
    setBrowserMeal(null);
    toast.success(`${newItems.length} food${newItems.length !== 1 ? "s" : ""} added to ${mt}`);
  };

  const handleAddManual   = (mt: MealType, item: Omit<IMealFoodItem, "IdFoodItem" | "IdMeal">) =>
    updateMealFoods(mt, items => [...items, { ...item, SortOrder: items.length + 1 }]);
  const handleEditFood    = (mt: MealType, so: number, edited: Omit<IMealFoodItem, "IdFoodItem" | "IdMeal">) =>
    updateMealFoods(mt, items => items.map(i => i.SortOrder === so ? { ...i, ...edited, SortOrder: so } : i));
  const handleDeleteFood  = (mt: MealType, so: number) =>
    updateMealFoods(mt, items => items.filter(i => i.SortOrder !== so).map((i, idx) => ({ ...i, SortOrder: idx + 1 })));

  const handleSave = () => {
    if (!plan) return;
    if (plan.Meals.reduce((s, m) => s + m.FoodItems.length, 0) === 0) {
      toast.error("Add at least one food item before saving"); return;
    }
    if (isRangePlan) {
      setSaveRangeOpen(true);
      return;
    }
    saveMutation.mutate(plan);
  };

  const logsForMeal = (mt: MealType): IMealLog[] => {
    if (!plan) return [];
    const meal = plan.Meals.find(m => m.MealType === mt);
    if (!meal) return [];
    return meal.FoodItems.filter(f => f.IdFoodItem != null && logMap.has(f.IdFoodItem)).map(f => logMap.get(f.IdFoodItem!)!);
  };

  const hasChanges = React.useMemo(() => {
    if (!plan) return false;
    if (isNewPlan) return plan.Meals.some(m => m.FoodItems.length > 0);
    if (!savedSnapshot) return true;
    return planSnapshot(plan) !== savedSnapshot;
  }, [plan, isNewPlan, savedSnapshot]);

  const selectedClient = clientList.find(c => c.IdUser === selectedUserId);
  const hasEndDate     = !!plan?.EndDate;

  // unsaved-changes guard
  const [unsavedGuard, setUnsavedGuard] = useState<{ action: () => void } | null>(null);
  const [, navigate] = useLocation();

  const guardedNavigate = (action: () => void) => {
    if (hasChanges && !isNewPlan) { setUnsavedGuard({ action }); return; }
    action();
  };

  const handleNavAttempt = (href: string): boolean => {
    if (hasChanges && !isNewPlan) {
      setUnsavedGuard({ action: () => navigate(href) });
      return false; // block the Link
    }
    return true; // allow navigation
  };

  // date navigation helpers
  const shiftDate = (days: number) =>
    guardedNavigate(() => setSelectedDate(moment(selectedDate, "DD-MM-YYYY").add(days, "days").format("DD-MM-YYYY")));
  const isToday = selectedDate === todayStr();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">

      {/* ══════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════ */}
      <AdminPageHeader title="Meal Plans" subtitle="FitwithPK Admin" right={
        <div className="flex items-center gap-1.5">
          {plan && !isNewPlan && (
            <button
              onClick={() => guardedNavigate(() => setViewMode(v => !v))}
              className={`flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                viewMode ? "bg-white/30 border-white/40 text-white" : "bg-white/10 border-white/20 text-white/80"
              }`}
            >
              {viewMode ? <><Edit3 className="h-3 w-3" />Edit</> : <><Eye className="h-3 w-3" />Progress</>}
            </button>
          )}
          {plan && !viewMode && (
            <button
              onClick={() => setSettingsOpen(s => !s)}
              className={`p-2 rounded-full transition-colors ${settingsOpen ? "bg-white/30 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          )}
        </div>
      } />

      {/* client selector + date navigation */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-0">
        {/* client selector */}
        <div className="relative mb-3">
          <select
            className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 text-sm pl-3 pr-10 text-gray-800 font-medium appearance-none"
            value={selectedUserId ?? ""}
            onChange={e => { const id = e.target.value ? Number(e.target.value) : null; setSelectedUserId(id); setCopyTargetUserId(id); }}
          >
            <option value="">— Select a client —</option>
            {clientList.map(c => <option key={c.IdUser} value={c.IdUser}>{c.FirstName} {c.LastName}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        {/* date navigation strip */}
        <div className="pb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftDate(-1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setCalendarOpen(o => !o)}
                    className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 text-sm text-center font-semibold text-gray-800 px-3 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
                    <CalendarDays className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                    {moment(selectedDate, "DD-MM-YYYY").format("ddd, MMM D YYYY")}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="center">
                  <Calendar
                    mode="single"
                    selected={moment(selectedDate, "DD-MM-YYYY").toDate()}
                    onSelect={date => {
                      if (date) {
                        const newDate = moment(date).format("DD-MM-YYYY");
                        setCalendarOpen(false);
                        guardedNavigate(() => setSelectedDate(newDate));
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <button onClick={() => shiftDate(1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {!isToday && (
            <button
              onClick={() => guardedNavigate(() => setSelectedDate(todayStr()))}
              className="mt-1.5 w-full text-[11px] font-semibold text-orange-500 hover:text-orange-600 flex items-center justify-center gap-1 py-1 transition-colors"
            >
              ↩ Jump to today
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SETTINGS PANEL (collapsible, slides in below header)
      ══════════════════════════════════════════════════════════ */}
      {settingsOpen && plan && !viewMode && (
        <div className="bg-white border-b border-gray-100 px-4 py-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Plan Settings</p>

          <Input
            value={plan.PlanName}
            onChange={e => setPlan(p => p ? { ...p, PlanName: e.target.value } : p)}
            className="h-10 text-sm bg-gray-50 border-gray-200"
            placeholder="Plan name (e.g. High Protein Week)"
          />
          <Input
            value={plan.Notes ?? ""}
            onChange={e => setPlan(p => p ? { ...p, Notes: e.target.value } : p)}
            className="h-10 text-sm bg-gray-50 border-gray-200"
            placeholder="Notes for client (optional)"
          />

          {/* repeat toggle */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-3">
            <button
              className="w-full flex items-center gap-3 text-left"
              onClick={() => setPlan(p => p ? { ...p, EndDate: hasEndDate ? undefined : dateInputToFmt(fmtToDateInput(selectedDate)) } : p)}
            >
              <div className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 ${hasEndDate ? "bg-orange-500" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-all duration-200 ${hasEndDate ? "left-5" : "left-0.5"}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Repeat2 className="h-3.5 w-3.5 text-orange-400" /> Repeat for date range
                </p>
                <p className="text-[11px] text-gray-400">Client sees this plan every day in range</p>
              </div>
            </button>

            {hasEndDate && (
              <div className="space-y-2 pt-1 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
                  <span>From</span>
                  <span className="font-semibold text-gray-700">{moment(selectedDate, "DD-MM-YYYY").format("ddd, MMM D YYYY")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 w-6 flex-shrink-0">To</span>
                  <input
                    type="date"
                    min={fmtToDateInput(selectedDate)}
                    value={plan.EndDate ? fmtToDateInput(plan.EndDate) : ""}
                    onChange={e => setPlan(p => p ? { ...p, EndDate: e.target.value ? dateInputToFmt(e.target.value) : undefined } : p)}
                    className="flex-1 h-9 rounded-lg border border-orange-300 bg-white text-sm px-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button onClick={() => setPlan(p => p ? { ...p, EndDate: undefined } : p)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {plan.EndDate && (
                  <p className="text-[11px] text-orange-600 pl-4">
                    Active for <strong>{moment(plan.EndDate, "DD-MM-YYYY").diff(moment(selectedDate, "DD-MM-YYYY"), "days") + 1} days</strong>
                    {" "}· ends {moment(plan.EndDate, "DD-MM-YYYY").format("ddd, MMM D")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* copy / delete row */}
          {plan.IdMealPlan && (
            <div className="flex gap-2">
              <button onClick={() => setCopyOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                <Copy className="h-3.5 w-3.5" /> Copy plan
              </button>
              <button onClick={() => setDeleteOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MAIN SCROLLABLE CONTENT
      ══════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto pb-36">

        {!selectedUserId ? (
          /* ── no client selected ── */
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-5 shadow-sm">
              <UtensilsCrossed className="h-10 w-10 text-orange-400" />
            </div>
            <p className="text-base font-bold text-gray-700">Choose a client first</p>
            <p className="text-sm text-gray-400 mt-1">Select a client above to create or view their meal plan</p>
          </div>

        ) : planLoading ? (
          /* ── loading ── */
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
          </div>

        ) : plan ? (
          <div className="px-4 pt-4 space-y-3">

            {/* ── status + macros bar ── */}
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-center gap-3">
              {/* plan status */}
              <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                isNewPlan ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
              }`}>
                {isNewPlan ? "✦ New" : "✓ Saved"}
              </div>
              {plan.EndDate && (
                <div className="flex items-center gap-1 text-[11px] text-orange-600 bg-orange-50 px-2 py-1 rounded-full font-semibold">
                  <Repeat2 className="h-3 w-3" />
                  until {moment(plan.EndDate, "DD-MM-YYYY").format("MMM D")}
                </div>
              )}
              {adherence && (
                <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  adherence.pct >= 80 ? "bg-green-100 text-green-700" : adherence.pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                }`}>
                  {adherence.pct}% adherence
                </div>
              )}
            </div>

            {/* ── macro summary (only when foods exist) ── */}
            {planMacros && planMacros.kcal > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-gray-800">{planMacros.kcal}</p>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">kcal</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-red-500">{planMacros.protein}g</p>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Protein</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-amber-500">{planMacros.carbs}g</p>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Carbs</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-purple-500">{planMacros.fat}g</p>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Fat</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── meal cards ── */}
            {MEAL_TYPES.map(mt => (
              <MealCard
                key={mt}
                mealType={mt}
                foodItems={plan.Meals.find(m => m.MealType === mt)?.FoodItems ?? []}
                logs={logsForMeal(mt)}
                viewMode={viewMode}
                onBrowse={() => setBrowserMeal(mt)}
                onAddManual={item => handleAddManual(mt, item)}
                onEditFood={(so, item) => handleEditFood(mt, so, item)}
                onDeleteFood={so => handleDeleteFood(mt, so)}
              />
            ))}

            {/* ── extra food logged by client outside the plan ── */}
            <ExtraFoodAdminCard logs={clientExtraFoodLogs} onImageClick={setExtraFoodPreviewImage} />

          </div>
        ) : null}

      </main>

      {/* ── Floating chat FAB ─────────────────────────────────────── */}
      {selectedUserId && selectedDate && clientQueries.length > 0 && (
        <button
          onClick={() => setQaOpen(o => !o)}
          className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          {clientQueries.filter(q => !q.Answer).length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {clientQueries.filter(q => !q.Answer).length}
            </span>
          )}
        </button>
      )}

      {/* ── Client Q&A slide-up drawer ────────────────────────────── */}
      {qaOpen && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setQaOpen(false)}
          />
          {/* drawer */}
          <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col h-[50vh]">
            {/* drawer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Client Questions</span>
                {clientQueries.filter(q => !q.Answer).length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {clientQueries.filter(q => !q.Answer).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refetchQueries()}
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
            {/* drawer body — thread only */}
            <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-4">
              {clientQueries.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  No questions from client for this day.
                </p>
              ) : (
                clientQueries.map(q => (
                  <div key={q.IdQuery} className="space-y-2">
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
                        <span className="text-[11px] text-gray-400 italic px-1">Awaiting your reply…</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            {/* pinned reply input */}
            {(() => {
              const unanswered = clientQueries.filter(q => !q.Answer);
              const q = unanswered[0];
              const allAnswered = unanswered.length === 0;
              return (
                <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 p-3 flex gap-2">
                  <textarea
                    disabled={allAnswered}
                    className="flex-1 min-h-[60px] max-h-[100px] p-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-blue-300 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    placeholder={allAnswered ? "All questions answered" : unanswered.length > 1 ? `Reply to question 1 of ${unanswered.length}…` : "Type your reply…"}
                    value={q ? (replyText[q.IdQuery!] ?? "") : ""}
                    onChange={e => q && setReplyText(prev => ({ ...prev, [q.IdQuery!]: e.target.value }))}
                  />
                  <button
                    disabled={allAnswered || !q || !replyText[q.IdQuery!]?.trim() || replyMutation.isPending}
                    onClick={() => q && replyMutation.mutate({ IdQuery: q.IdQuery!, Answer: replyText[q.IdQuery!] })}
                    className="self-center flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* ── Sticky save bar (fixed above mobile nav) ─────────────── */}
      {plan && !viewMode && hasChanges && (
        <div className="fixed bottom-16 left-0 right-0 z-10 bg-white border-t border-gray-100 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || createSingleDayMutation.isPending || !hasChanges}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-[0.98]"
          >
            {saveMutation.isPending
              ? <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><Save className="h-4 w-4" /> {isNewPlan ? "Create Meal Plan" : "Save Changes"}</>
            }
          </button>
        </div>
      )}

      <MobileAdminNav onNavAttempt={handleNavAttempt} />

      {/* ── Food Browser Dialog ───────────────────────────────────── */}
      <FoodBrowserDialog
        open={!!browserMeal}
        mealType={browserMeal}
        foodDb={allFoods}
        foodDbLoading={foodDbLoading}
        foodDbError={foodDbError}
        onClose={() => setBrowserMeal(null)}
        onConfirm={handleBrowseConfirm}
      />

      {/* ── Copy Dialog ───────────────────────────────────────────── */}
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Copy Meal Plan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Target Date</label>
              <Input type="date" value={fmtToDateInput(copyTargetDate)}
                onChange={e => setCopyTargetDate(dateInputToFmt(e.target.value))} className="h-9" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Target Client</label>
              <select className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3"
                value={copyTargetUserId ?? ""}
                onChange={e => setCopyTargetUserId(e.target.value ? Number(e.target.value) : null)}>
                {clientList.map(c => (
                  <option key={c.IdUser} value={c.IdUser}>
                    {c.FirstName} {c.LastName}{c.IdUser === selectedUserId ? " (same)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)}>Cancel</Button>
            <Button onClick={() => copyMutation.mutate()} disabled={copyMutation.isPending || !copyTargetDate}>
              {copyMutation.isPending ? "Copying…" : "Copy Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ─────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" /> Delete Meal Plan
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 px-1">
            Permanently delete the meal plan for <strong>{selectedDate}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive"
              onClick={() => plan?.IdMealPlan && deleteMutation.mutate(plan.IdMealPlan)}
              disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Unsaved changes guard ─────────────────────────────────── */}
      <Dialog open={!!unsavedGuard} onOpenChange={open => { if (!open) setUnsavedGuard(null); }}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" /> Unsaved Changes
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 px-1">
            You have unsaved changes on this date. If you navigate away they will be lost.
          </p>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button variant="outline" className="flex-1" onClick={() => setUnsavedGuard(null)}>
              Keep Editing
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => { unsavedGuard?.action(); setUnsavedGuard(null); }}>
              Discard &amp; Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save scope dialog (range plan) ────────────────────────── */}
      <Dialog open={saveRangeOpen} onOpenChange={setSaveRangeOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat2 className="h-5 w-5 text-orange-500" /> Save Changes
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 px-1">
            This date is part of a repeating plan
            {plan?.AssignedDate && plan?.EndDate
              ? ` (${moment(plan.AssignedDate, "DD-MM-YYYY").format("MMM D")} – ${moment(plan.EndDate, "DD-MM-YYYY").format("MMM D")})`
              : ""
            }.
            How would you like to apply your changes?
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => {
                if (!plan) return;
                createSingleDayMutation.mutate({
                  ...plan,
                  IdMealPlan: undefined,
                  AssignedDate: selectedDate,
                  EndDate: undefined,
                });
              }}
              disabled={createSingleDayMutation.isPending}
              className="w-full flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 transition-colors text-left disabled:opacity-60"
            >
              <span className="text-sm font-bold text-orange-700">Only {moment(selectedDate, "DD-MM-YYYY").format("ddd, MMM D")}</span>
              <span className="text-xs text-orange-600">Creates a separate plan for this day only. Other dates in the series stay unchanged.</span>
            </button>
            <button
              onClick={() => { setSaveRangeOpen(false); saveMutation.mutate(plan!); }}
              disabled={saveMutation.isPending}
              className="w-full flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
            >
              <span className="text-sm font-bold text-gray-700">Entire series</span>
              <span className="text-xs text-gray-500">Updates the plan for all dates in the repeating range.</span>
            </button>
          </div>
          <DialogFooter className="pt-1">
            <Button variant="ghost" size="sm" onClick={() => setSaveRangeOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Additional food photo lightbox ── */}
      <Dialog open={!!extraFoodPreviewImage} onOpenChange={open => !open && setExtraFoodPreviewImage(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-1 overflow-hidden">
          {extraFoodPreviewImage && (
            <img
              src={extraFoodPreviewImage}
              alt="Additional food full size"
              className="max-w-full max-h-[85vh] w-full object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
