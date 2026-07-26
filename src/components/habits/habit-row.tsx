import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Minus, Plus, Sparkles, X, Zap } from "lucide-react";
import { habitColor, IHabitForDay } from "../../interface/IHabit";
import { HabitIcon } from "./habit-icon";

interface HabitRowProps {
  habit: IHabitForDay;
  onToggle?: (h: IHabitForDay) => void;
  onStep?: (h: IHabitForDay, delta: number) => void;
  busy?: boolean;
  /** Past days outside the log window render as a status list, not controls. */
  readOnly?: boolean;
}

/** One habit line. Shared by the home card and the day sheet. */
export function HabitRow({ habit: h, onToggle, onStep, busy = false, readOnly = false }: HabitRowProps) {
  const reduce = useReducedMotion();
  const c = habitColor(h.ColorKey);
  const done = h.IsCompleted === 1;
  // Counted habits (3L water, 10 min stretching) get steppers; the rest toggle.
  const counted = h.TargetCount > 1 && !h.LinkedMetric;

  return (
    <li
      className={`flex items-center gap-3 border-b border-gray-100 py-2.5 last:border-none dark:border-gray-800 ${
        done ? "opacity-60" : ""
      }`}
    >
      {readOnly ? (
        <div
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            done ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
          }`}
        >
          {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-3.5 w-3.5" />}
        </div>
      ) : (
        <motion.button
          type="button"
          onClick={() => onToggle?.(h)}
          disabled={busy}
          aria-label={`${done ? "Mark incomplete" : "Complete"}: ${h.Name}`}
          aria-pressed={done}
          whileTap={reduce ? {} : { scale: 0.85 }}
          animate={reduce ? {} : { scale: done ? [1, 1.25, 1] : 1 }}
          transition={{ duration: 0.32 }}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
            done
              ? "bg-emerald-500 text-white"
              : "border-2 border-gray-300 text-transparent dark:border-gray-600"
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </motion.button>
      )}

      <div className="min-w-0 flex-1">
        <p
          className={`flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white ${
            done ? "line-through" : ""
          }`}
        >
          <span className={c.text}>
            <HabitIcon name={h.Icon} className="h-4 w-4" />
          </span>
          <span className="truncate">{h.Name}</span>
          {!!h.LinkedMetric && (
            <span
              title={`Auto-completes from your ${h.LinkedMetric.toLowerCase()} tracker`}
              className="flex shrink-0 items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 text-[9px] font-bold uppercase text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
            >
              <Zap className="h-2.5 w-2.5" /> auto
            </span>
          )}
        </p>
        {h.TargetCount > 1 && (
          <p className="ml-5 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            {h.CompletedCount} of {h.TargetCount} {h.Unit}
          </p>
        )}
      </div>

      {!readOnly && counted && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onStep?.(h, -1)}
            disabled={busy || h.CompletedCount === 0}
            aria-label={`Remove one ${h.Unit} from ${h.Name}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onStep?.(h, 1)}
            disabled={busy || done}
            aria-label={`Add one ${h.Unit} to ${h.Name}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!readOnly && done && !counted && <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />}
    </li>
  );
}
