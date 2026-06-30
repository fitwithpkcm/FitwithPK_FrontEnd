export const SUPPLEMENT_TIMINGS = [
  'Morning', 'Pre-Workout', 'Post-Workout', 'With Lunch', 'Evening', 'Bedtime',
] as const;
export type SupplementTiming = typeof SUPPLEMENT_TIMINGS[number];

export const TIMING_ICONS: Record<SupplementTiming, string> = {
  'Morning':      '🌅',
  'Pre-Workout':  '⚡',
  'Post-Workout': '💪',
  'With Lunch':   '🍽️',
  'Evening':      '🌆',
  'Bedtime':      '🌙',
};

export const TIMING_COLORS: Record<SupplementTiming, string> = {
  'Morning':      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Pre-Workout':  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Post-Workout': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'With Lunch':   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Evening':      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Bedtime':      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
};

export type SupplementFrequency = 'Daily' | 'Weekly';

export const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
] as const;

export interface ISupplement {
  IdSupplement?: number;
  IdCoach?: number;
  IdUser: number;
  Name: string;
  Dose?: string;
  Timing: SupplementTiming;
  Duration?: string;
  ReminderTime?: string;
  Notes?: string;
  Frequency?: SupplementFrequency;
  DaysOfWeek?: string;   // comma-separated day numbers e.g. "1,3,5"
  IsActive?: number;
  CreatedAt?: string;
}

export interface ISupplementLog {
  IdLog?: number;
  IdSupplement: number;
  IdUser?: number;
  LogDate: string;
  IsTaken: 0 | 1;
  TakenAt?: string;
  Notes?: string;
}

export interface ISupplementAdherence {
  IdSupplement: number;
  Name: string;
  Timing: SupplementTiming;
  DaysLogged: number;
  DaysTaken: number;
  TotalDays: number;
}
