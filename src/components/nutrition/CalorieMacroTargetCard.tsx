import React from "react";
import { Flame, RefreshCw, AlertTriangle } from "lucide-react";
import { IBodyMeasurement } from "../../interface/IBodyMeasurement";
import {
  ACTIVITY_LEVELS, DEFAULT_ACTIVITY_LEVEL, DEFAULT_MACRO_SPLIT, GOAL_ADJUST_PRESETS,
  MACRO_PRESETS, NutritionTarget, applyGoalAdjust, isMacroSplitValid, macroGrams,
  macroSplitTotal, tdeeFromBmr,
} from "../../lib/nutrition";

// Builds a daily calorie + macro target from the client's latest weekly
// measurement (BMR) → activity level → goal adjustment → macro % split.
// Fully controlled: the parent owns `value` and persists it.

interface CalorieMacroTargetCardProps {
  bmr: number | null;
  latestMeasurement?: IBodyMeasurement;
  value?: NutritionTarget;
  onChange: (n: NutritionTarget | undefined) => void;
  /** hide the outer card chrome when embedded in a dialog that already has a frame */
  bare?: boolean;
}

export default function CalorieMacroTargetCard({ bmr, latestMeasurement, value, onChange, bare }: CalorieMacroTargetCardProps) {
  const draft: NutritionTarget = value ?? {
    activityLevel: DEFAULT_ACTIVITY_LEVEL, goalAdjustPct: 0, calories: 0, ...DEFAULT_MACRO_SPLIT,
  };
  const tdee = tdeeFromBmr(bmr, draft.activityLevel);
  const suggested = applyGoalAdjust(tdee, draft.goalAdjustPct);
  const grams = macroGrams(draft.calories, draft);
  const splitTotal = macroSplitTotal(draft);
  const splitValid = isMacroSplitValid(draft);
  const stale = !!value && !!latestMeasurement?.DateRange && !!draft.basisDate
    && latestMeasurement.DateRange !== draft.basisDate;

  const patch = (p: Partial<NutritionTarget>) => onChange({ ...draft, ...p });
  const setActivity = (activityLevel: string) =>
    patch({ activityLevel, calories: applyGoalAdjust(tdeeFromBmr(bmr, activityLevel), draft.goalAdjustPct) ?? draft.calories });
  const setGoal = (goalAdjustPct: number) =>
    patch({ goalAdjustPct, calories: applyGoalAdjust(tdee, goalAdjustPct) ?? draft.calories });
  const recalc = () => patch({ calories: suggested ?? draft.calories });

  const shell = bare ? "space-y-4" : "bg-white rounded-xl border p-5 space-y-4";

  if (!value) {
    return (
      <div className={bare ? "" : "bg-white rounded-xl border p-5"}>
        <div className="flex items-center gap-2 mb-1">
          <Flame size={18} className="text-orange-500" />
          <p className="font-semibold text-gray-800">Calorie &amp; Macro Target</p>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          {bmr == null
            ? "Needs the client's height + age on file and at least one weekly update before a target can be built."
            : "Build a daily calorie + macro target from this client's latest weekly measurement."}
        </p>
        <button
          disabled={bmr == null}
          onClick={() => onChange({
            activityLevel: DEFAULT_ACTIVITY_LEVEL, goalAdjustPct: 0,
            calories: applyGoalAdjust(tdeeFromBmr(bmr, DEFAULT_ACTIVITY_LEVEL), 0) ?? 0,
            ...DEFAULT_MACRO_SPLIT,
          })}
          className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-40"
        >
          Set up calorie target
        </button>
      </div>
    );
  }

  return (
    <div className={shell}>
      {!bare && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-500" />
            <p className="font-semibold text-gray-800">Calorie &amp; Macro Target</p>
          </div>
          <button onClick={() => onChange(undefined)} className="text-xs text-gray-400 hover:text-red-500">Remove</button>
        </div>
      )}

      {/* BMR / TDEE from the latest measurement */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-700 font-medium">BMR</p>
          <p className="text-xl font-bold text-blue-800">{bmr != null ? Math.round(bmr) : "—"} <span className="text-xs font-normal">cal/day</span></p>
          {latestMeasurement?.DateRange && (
            <p className="text-[11px] text-blue-500">from {latestMeasurement.DateRange}{latestMeasurement.Weight ? ` · ${latestMeasurement.Weight} kg` : ""}</p>
          )}
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3">
          <p className="text-xs text-green-700 font-medium">TDEE</p>
          <p className="text-xl font-bold text-green-800">{tdee != null ? tdee : "—"} <span className="text-xs font-normal">cal/day</span></p>
          <p className="text-[11px] text-green-600">BMR × activity</p>
        </div>
      </div>

      {stale && (
        <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span>A newer weekly measurement ({latestMeasurement?.DateRange}) exists since this target was set ({draft.basisDate}). Recalculate to use it.</span>
        </div>
      )}

      {/* Activity level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Activity level</label>
        <select
          value={draft.activityLevel}
          onChange={e => setActivity(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        >
          {Object.entries(ACTIVITY_LEVELS).map(([key, v]) => (
            <option key={key} value={key}>{v.label} (×{v.multiplier})</option>
          ))}
        </select>
      </div>

      {/* Goal adjustment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal adjustment</label>
        <div className="flex flex-wrap gap-1.5">
          {GOAL_ADJUST_PRESETS.map(p => (
            <button
              key={p.pct}
              onClick={() => setGoal(p.pct)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                draft.goalAdjustPct === p.pct
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {p.label} {p.pct > 0 ? `+${p.pct}` : p.pct}%
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-500">Or enter manually</span>
          <input
            type="number"
            min={-50} max={50}
            value={draft.goalAdjustPct}
            onFocus={e => e.target.select()}
            onChange={e => setGoal(Math.min(50, Math.max(-50, parseInt(e.target.value) || 0)))}
            className="w-16 text-center p-1 border border-gray-300 rounded text-sm font-semibold focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
          <span className="text-xs text-gray-400">%</span>
        </div>
      </div>

      {/* Calorie target */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Daily calorie target</label>
          <input
            type="number"
            value={draft.calories || ""}
            onFocus={e => e.target.select()}
            onChange={e => patch({ calories: Math.max(0, parseInt(e.target.value) || 0) })}
            className="w-full p-2 border border-gray-300 rounded-lg text-lg font-bold text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>
        <button
          onClick={recalc}
          disabled={suggested == null}
          className="h-10 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1 disabled:opacity-40"
        >
          <RefreshCw size={13} /> {suggested != null ? `Use ${suggested}` : "Recalculate"}
        </button>
      </div>

      {/* Macro split */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Macro split</label>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            splitValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {splitTotal}%{splitValid ? "" : " — must total 100%"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "proteinPct" as const, label: "Protein", g: grams.proteinG, color: "text-red-500" },
            { key: "carbsPct" as const,   label: "Carbs",   g: grams.carbsG,   color: "text-amber-500" },
            { key: "fatPct" as const,     label: "Fat",     g: grams.fatG,     color: "text-purple-500" },
          ]).map(m => (
            <div key={m.key} className="bg-gray-50 rounded-lg p-2 text-center">
              <p className={`text-[11px] font-semibold uppercase ${m.color}`}>{m.label}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <input
                  type="number"
                  min={0} max={100}
                  value={draft[m.key] ?? 0}
                  onFocus={e => e.target.select()}
                  onChange={e => patch({ [m.key]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                  className="w-12 text-center p-1 border border-gray-200 rounded text-sm font-bold focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">{m.g} g</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {MACRO_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => patch(p.split)}
              className="px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              {p.label} {p.split.proteinPct}/{p.split.carbsPct}/{p.split.fatPct}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
