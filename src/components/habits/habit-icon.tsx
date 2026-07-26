import React from "react";
import {
  CircleCheck, Droplet, Footprints, Moon, Dumbbell, Brain, Beef, CandyOff,
  Carrot, StretchHorizontal, SmartphoneCharging, NotebookPen, Pill, Heart,
  BookOpen, Sun, Apple, Bike, Waves, Wind, Coffee, Salad, Timer, Target,
  Sparkles, Flame, type LucideIcon,
} from "lucide-react";

/**
 * Explicit map rather than `import * as Lucide` — a namespace import pulls the
 * whole icon set into the bundle, which matters for a PWA.
 */
export const HABIT_ICON_MAP: Record<string, LucideIcon> = {
  CircleCheck, Droplet, Footprints, Moon, Dumbbell, Brain, Beef, CandyOff,
  Carrot, StretchHorizontal, SmartphoneCharging, NotebookPen, Pill, Heart,
  BookOpen, Sun, Apple, Bike, Waves, Wind, Coffee, Salad, Timer, Target,
  Sparkles, Flame,
};

interface HabitIconProps {
  name?: string | null;
  className?: string;
}

/** Falls back to a generic tick when a stored icon name isn't in the map. */
export function HabitIcon({ name, className = "h-5 w-5" }: HabitIconProps) {
  const Icon = HABIT_ICON_MAP[name ?? ""] ?? CircleCheck;
  return <Icon className={className} />;
}
