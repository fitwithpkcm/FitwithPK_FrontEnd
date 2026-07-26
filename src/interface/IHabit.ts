// Field names mirror the SQL columns in the backend's setup_habit_tables.sql.

export const HABIT_CATEGORIES = [
  "Nutrition",
  "Movement",
  "Recovery",
  "Mindset",
  "Lifestyle",
] as const;
export type HabitCategory = typeof HABIT_CATEGORIES[number];

/** Habits can auto-complete off the existing daily-update trackers. */
export const LINKED_METRICS = ["Water", "Steps", "Sleep", "Workout"] as const;
export type LinkedMetric = typeof LINKED_METRICS[number];

/** ISO weekdays — 1 = Monday, matching the DaysOfWeek column. */
export const DAYS_OF_WEEK = [
  { value: "1", short: "M", label: "Mon" },
  { value: "2", short: "T", label: "Tue" },
  { value: "3", short: "W", label: "Wed" },
  { value: "4", short: "T", label: "Thu" },
  { value: "5", short: "F", label: "Fri" },
  { value: "6", short: "S", label: "Sat" },
  { value: "7", short: "S", label: "Sun" },
] as const;

export const EVERY_DAY = "1,2,3,4,5,6,7";

/** Tailwind classes per ColorKey. Kept as full literals so Tailwind can see them. */
export const HABIT_COLORS: Record<string, { bg: string; text: string; ring: string; solid: string }> = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-950/40",     text: "text-blue-600 dark:text-blue-400",     ring: "ring-blue-500",   solid: "bg-blue-500" },
  green:  { bg: "bg-green-50 dark:bg-green-950/40",   text: "text-green-600 dark:text-green-400",   ring: "ring-green-500",  solid: "bg-green-500" },
  orange: { bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-500", solid: "bg-orange-500" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-500", solid: "bg-purple-500" },
  pink:   { bg: "bg-pink-50 dark:bg-pink-950/40",     text: "text-pink-600 dark:text-pink-400",     ring: "ring-pink-500",   solid: "bg-pink-500" },
  red:    { bg: "bg-red-50 dark:bg-red-950/40",       text: "text-red-600 dark:text-red-400",       ring: "ring-red-500",    solid: "bg-red-500" },
  amber:  { bg: "bg-amber-50 dark:bg-amber-950/40",   text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500",  solid: "bg-amber-500" },
  yellow: { bg: "bg-yellow-50 dark:bg-yellow-950/40", text: "text-yellow-600 dark:text-yellow-400", ring: "ring-yellow-500", solid: "bg-yellow-500" },
  teal:   { bg: "bg-teal-50 dark:bg-teal-950/40",     text: "text-teal-600 dark:text-teal-400",     ring: "ring-teal-500",   solid: "bg-teal-500" },
  cyan:   { bg: "bg-cyan-50 dark:bg-cyan-950/40",     text: "text-cyan-600 dark:text-cyan-400",     ring: "ring-cyan-500",   solid: "bg-cyan-500" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400", ring: "ring-indigo-500", solid: "bg-indigo-500" },
  rose:   { bg: "bg-rose-50 dark:bg-rose-950/40",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500",   solid: "bg-rose-500" },
  slate:  { bg: "bg-slate-100 dark:bg-slate-800/60",  text: "text-slate-600 dark:text-slate-300",   ring: "ring-slate-500",  solid: "bg-slate-500" },
};

export const habitColor = (key?: string) => HABIT_COLORS[key ?? "blue"] ?? HABIT_COLORS.blue;

/** Icon names offered in the admin picker — all valid lucide-react exports. */
export const HABIT_ICON_CHOICES = [
  "CircleCheck", "Droplet", "Footprints", "Moon", "Dumbbell", "Brain", "Beef",
  "CandyOff", "Carrot", "StretchHorizontal", "SmartphoneCharging", "NotebookPen",
  "Pill", "Heart", "BookOpen", "Sun", "Apple", "Bike", "Waves", "Wind",
  "Coffee", "Salad", "Timer", "Target", "Sparkles", "Flame",
] as const;

export const TIER_STYLES: Record<string, { bg: string; text: string; border: string; glow: string; label: string }> = {
  bronze:   { bg: "bg-amber-100 dark:bg-amber-950/50",   text: "text-amber-700 dark:text-amber-400",   border: "border-amber-300 dark:border-amber-800",   glow: "shadow-amber-400/40",   label: "Bronze" },
  silver:   { bg: "bg-slate-100 dark:bg-slate-800/70",   text: "text-slate-600 dark:text-slate-300",   border: "border-slate-300 dark:border-slate-700",   glow: "shadow-slate-400/40",   label: "Silver" },
  gold:     { bg: "bg-yellow-100 dark:bg-yellow-950/50", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-300 dark:border-yellow-800", glow: "shadow-yellow-400/50",  label: "Gold" },
  platinum: { bg: "bg-cyan-100 dark:bg-cyan-950/50",     text: "text-cyan-700 dark:text-cyan-300",     border: "border-cyan-300 dark:border-cyan-800",     glow: "shadow-cyan-400/50",    label: "Platinum" },
};

export const tierStyle = (tier?: string) => TIER_STYLES[tier ?? "bronze"] ?? TIER_STYLES.bronze;

// ── Models ────────────────────────────────────────────────────────

export interface IHabit {
  IdHabit?: number;
  Name: string;
  Description?: string | null;
  Icon: string;
  ColorKey: string;
  Category: HabitCategory | string;
  DefaultTargetCount: number;
  Unit: string;
  LinkedMetric?: LinkedMetric | null;
  IdCoach?: number | null;
  IsActive?: number;
}

export interface IHabitAssignment {
  IdAssignment?: number;
  IdHabit: number;
  IdUser: number;
  TargetCount: number;
  DaysOfWeek: string;
  ReminderTime?: string | null;
  StartDate: string;            // DD-MM-YYYY
  EndDate?: string | null;      // DD-MM-YYYY
  Notes?: string | null;
  SortOrder?: number;
  IsActive?: number;
  // Joined from tbl_habits
  Name?: string;
  Description?: string | null;
  Icon?: string;
  ColorKey?: string;
  Category?: string;
  Unit?: string;
  LinkedMetric?: LinkedMetric | null;
}

/** An assignment joined with its habit and the log state for one day. */
export interface IHabitForDay extends IHabitAssignment {
  IdAssignment: number;
  Name: string;
  Icon: string;
  ColorKey: string;
  Category: string;
  Unit: string;
  CompletedCount: number;
  IsCompleted: number;
  IsAuto: number;
}

export interface IHabitDaySummary {
  LogDate: string;              // DD-MM-YYYY
  LogDateSql?: string;
  TotalHabits: number;
  CompletedHabits: number;
  CompletionPercent: number;
  IsPerfectDay: number;
}

export interface IHabitStats {
  CurrentStreak: number;
  BestStreak: number;
  PerfectDays: number;
  TotalCompletions: number;
  Last30Percent: number;
}

export interface IHabitTrend {
  IdAssignment: number;
  IdHabit: number;
  Name: string;
  Icon: string;
  ColorKey: string;
  Unit: string;
  ScheduledDays: number;
  CompletedDays: number;
  Percent: number;
}

export interface IHabitBadge {
  IdBadge?: number;
  BadgeKey: string;
  Tier: string;
  EarnedDate?: string;
  MetaJson?: string | null;
  SeenAt?: string | null;
  Label: string;
  Description: string;
  Unlock: string;
}

/** Response from getMyHabitsForDay and toggleHabitLog. */
export interface IHabitDayResponse {
  Day: string;
  Habits: IHabitForDay[];
  Summary: IHabitDaySummary | null;
  Stats: IHabitStats;
  CanLog?: boolean;
  UnseenBadges?: IHabitBadge[];
  NewBadges?: IHabitBadge[];
}

export interface IHabitBadgesResponse {
  Earned: IHabitBadge[];
  Locked: IHabitBadge[];
}

export interface IClientHabitStatsResponse {
  Stats: IHabitStats;
  Trends: IHabitTrend[];
  Badges: IHabitBadge[];
  History: IHabitDaySummary[];
}

/** Five buckets drive the heatmap's colour intensity. */
export const heatLevel = (s?: IHabitDaySummary): 0 | 1 | 2 | 3 | 4 => {
  if (!s || s.TotalHabits === 0) return 0;
  if (s.CompletionPercent >= 100) return 4;
  if (s.CompletionPercent >= 51) return 3;
  if (s.CompletionPercent >= 26) return 2;
  if (s.CompletionPercent >= 1) return 1;
  return 0;
};

export const HEAT_CLASSES: Record<number, string> = {
  0: "bg-gray-100 dark:bg-gray-800",
  1: "bg-emerald-200 dark:bg-emerald-900",
  2: "bg-emerald-300 dark:bg-emerald-800",
  3: "bg-emerald-400 dark:bg-emerald-600",
  4: "bg-emerald-500 dark:bg-emerald-400",
};
