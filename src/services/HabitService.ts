import { httpCall } from "./HttpService";
import { API_URL } from "../common/Urls";
import { IHabit, IHabitAssignment } from "../interface/IHabit";

// ── Admin: library ────────────────────────────────────────────────

export const getHabitLibrary = () =>
  httpCall({ method: "post", url: API_URL.GET_HABIT_LIBRARY, data: {} });

export const createLibraryHabit = (params: IHabit) =>
  httpCall({ method: "post", url: API_URL.CREATE_LIBRARY_HABIT, data: params });

export const updateLibraryHabit = (params: IHabit) =>
  httpCall({ method: "post", url: API_URL.UPDATE_LIBRARY_HABIT, data: params });

export const deleteLibraryHabit = (IdHabit: number) =>
  httpCall({ method: "post", url: API_URL.DELETE_LIBRARY_HABIT, data: { IdHabit } });

// ── Admin: assignments ────────────────────────────────────────────

export const getHabitAssignmentsForClient = (IdUser: number) =>
  httpCall({ method: "post", url: API_URL.GET_HABIT_ASSIGNMENTS_FOR_CLIENT, data: { IdUser } });

/** Accepts one habit or a Habits[] array so a starter pack assigns in one call. */
export const assignHabits = (params: {
  IdUser: number;
  Habits: Array<Partial<IHabitAssignment> & { IdHabit: number }>;
}) => httpCall({ method: "post", url: API_URL.ASSIGN_HABIT, data: params });

export const updateHabitAssignment = (params: IHabitAssignment) =>
  httpCall({ method: "post", url: API_URL.UPDATE_HABIT_ASSIGNMENT, data: params });

export const unassignHabit = (IdAssignment: number) =>
  httpCall({ method: "post", url: API_URL.UNASSIGN_HABIT, data: { IdAssignment } });

export const getClientHabitStats = (params: { IdUser: number; days?: number }) =>
  httpCall({ method: "post", url: API_URL.GET_CLIENT_HABIT_STATS, data: params });

// ── Client ────────────────────────────────────────────────────────

export const getMyHabitsForDay = (params: { Day?: string } = {}) =>
  httpCall({ method: "post", url: API_URL.GET_MY_HABITS_FOR_DAY, data: params });

/** CompletedCount omitted = plain toggle; given = set the counter. */
export const toggleHabitLog = (params: {
  IdAssignment: number;
  Day?: string;
  CompletedCount?: number;
}) => httpCall({ method: "post", url: API_URL.TOGGLE_HABIT_LOG, data: params });

export const getMyHabitHistory = (params: { FromDate?: string; ToDate?: string } = {}) =>
  httpCall({ method: "post", url: API_URL.GET_MY_HABIT_HISTORY, data: params });

export const getMyHabitStats = (params: { days?: number } = {}) =>
  httpCall({ method: "post", url: API_URL.GET_MY_HABIT_STATS, data: params });

export const getMyHabitBadges = () =>
  httpCall({ method: "post", url: API_URL.GET_MY_HABIT_BADGES, data: {} });

export const markBadgesSeen = (BadgeKeys: string[]) =>
  httpCall({ method: "post", url: API_URL.MARK_BADGES_SEEN, data: { BadgeKeys } });
