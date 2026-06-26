// ── Workout Tracking Interfaces ──────────────────────────────────

export type WorkoutStatus = 'Planned' | 'Completed' | 'Missed' | 'Rescheduled';

export const WORKOUT_TYPES = [
  'Upper Body', 'Lower Body', 'Push', 'Pull', 'Legs',
  'Full Body', 'Cardio', 'Mobility', 'Rest Day',
] as const;
export type WorkoutTypeName = typeof WORKOUT_TYPES[number];

export const WORKOUT_STATUS: WorkoutStatus[] = ['Planned', 'Completed', 'Missed', 'Rescheduled'];

export const WEIGHT_UNITS = ['kg', 'lbs', 'bodyweight'] as const;
export type WeightUnit = typeof WEIGHT_UNITS[number];

export interface ISetLog {
  IdSetLog?:     number;
  IdExercise:    number;
  IdWorkout:     number;
  IdUser?:       number;
  LogDate:       string;
  SetNumber:     number;
  RepsCompleted: number;
  WeightUsed?:   number;
  WeightUnit?:   string;
  Notes?:        string;
  LoggedAt?:     string;
}

export interface IExerciseLibraryItem {
  IdLibraryItem?: number;
  ExerciseName:   string;
  Category?:      string;
  DefaultSets:    number;
  DefaultReps:    number;
  DefaultWeight?: number;
  WeightUnit?:    WeightUnit;
  RestSeconds?:   number;
  VideoUrl?:      string;
  Notes?:         string;
}

export interface IExercise {
  IdExercise?: number;
  IdWorkout?: number;
  ExerciseName: string;
  VideoUrl?: string;
  Sets: number;
  TargetReps: number;
  TargetWeight?: number;
  WeightUnit?: WeightUnit;
  RestSeconds?: number;
  Notes?: string;
  SortOrder: number;
}

export interface IWorkout {
  IdWorkout?: number;
  WorkoutName: string;
  IdUser: number;
  ScheduledDate: string;   // DD-MM-YYYY
  RescheduledFrom?: string; // DD-MM-YYYY – set when rescheduled
  Notes?: string;
  Status?: WorkoutStatus;
  CreatedAt?: string;
  UpdatedAt?: string;
  Exercises: IExercise[];
}

export interface IExerciseLog {
  IdExerciseLog?: number;
  IdExercise: number;
  IdWorkout: number;
  IdUser?: number;
  LogDate: string;          // DD-MM-YYYY
  WeightUsed?: number;
  WeightUnit?: WeightUnit;
  RepsCompleted: number;
  SetsCompleted: number;
  IsCompleted: 0 | 1;
  Notes?: string;
  LoggedAt?: string;
}

// ── Workout Templates ─────────────────────────────────────────────

export interface ITemplateExercise {
  IdTemplateExercise?: number;
  IdTemplate?:         number;
  ExerciseName:        string;
  VideoUrl?:           string;
  Sets:                number;
  TargetReps:          number;
  TargetWeight?:       number;
  WeightUnit?:         WeightUnit;
  RestSeconds?:        number;
  Notes?:              string;
  SortOrder:           number;
}

export interface IWorkoutTemplate {
  IdTemplate?:   number;
  IdCoach?:      number;
  TemplateName:  string;
  Category?:     string;
  Notes?:        string;
  CreatedAt?:    string;
  UpdatedAt?:    string;
  Exercises:     ITemplateExercise[];
}

export function createBlankTemplate(): IWorkoutTemplate {
  return { TemplateName: '', Category: '', Exercises: [] };
}

export function createBlankTemplateExercise(sortOrder: number): ITemplateExercise {
  return { ExerciseName: '', Sets: 3, TargetReps: 10, WeightUnit: 'kg', SortOrder: sortOrder };
}

// ── Client-side merged types ──────────────────────────────────────

export interface IExerciseWithLog extends IExercise {
  log?: IExerciseLog;
  isCompleted: boolean;
  weightUsed?: number;
  weightUnit?: WeightUnit;
  repsCompleted?: number;
  setsCompleted?: number;
  logNotes?: string;
}

export interface IWorkoutWithLogs extends IWorkout {
  exercisesWithLogs: IExerciseWithLog[];
  completedCount: number;
  totalCount: number;
  completionPercent: number;
}

// ── Utilities ─────────────────────────────────────────────────────

export function mergeWorkoutWithLogs(workout: IWorkout, logs: IExerciseLog[]): IWorkoutWithLogs {
  const logMap = new Map<number, IExerciseLog>();
  logs.forEach(l => { if (l.IdExercise) logMap.set(l.IdExercise, l); });

  const exercisesWithLogs: IExerciseWithLog[] = workout.Exercises.map(ex => {
    const log = ex.IdExercise ? logMap.get(ex.IdExercise) : undefined;
    return {
      ...ex,
      log,
      isCompleted: log?.IsCompleted === 1,
      weightUsed: log?.WeightUsed,
      weightUnit: log?.WeightUnit,
      repsCompleted: log?.RepsCompleted,
      setsCompleted: log?.SetsCompleted,
      logNotes: log?.Notes,
    };
  });

  const completedCount = exercisesWithLogs.filter(e => e.isCompleted).length;
  const totalCount = exercisesWithLogs.length;
  return {
    ...workout,
    exercisesWithLogs,
    completedCount,
    totalCount,
    completionPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
  };
}

export function createBlankWorkout(userId: number, date: string): IWorkout {
  return {
    WorkoutName: '',
    IdUser: userId,
    ScheduledDate: date,
    Status: 'Planned',
    Exercises: [],
  };
}

export function createBlankExercise(sortOrder: number): IExercise {
  return {
    ExerciseName: '',
    Sets: 3,
    TargetReps: 10,
    WeightUnit: 'kg',
    SortOrder: sortOrder,
  };
}
