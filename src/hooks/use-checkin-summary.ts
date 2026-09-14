// Backs the client dashboard's "Your check-ins" summary — see
// components/checkins/CheckinSummaryCard.tsx for the UI and
// lib/checkinSummary.ts for the actual counting rules this just wires up to
// data. Kept as its own hook (rather than inlined in home-page.tsx) so
// updates-page.tsx can invalidate the exact same query keys after a
// daily/weekly save without needing to know how the summary is computed.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDailyUpdate, getWeeklyUpdate } from "../services/UpdateServices";
import { getLoggedUserDetails } from "../services/ProfileService";
import { IDailyStats } from "../interface/IDailyUpdates";
import { IBodyMeasurement } from "../interface/IBodyMeasurement";
import { IUser } from "../interface/models/User";
import { ACCESS_STATUS } from "../common/Constant";
import { computeDailySummary, computeWeeklySummary, todayDateString, DailyCheckinSummary, WeeklyCheckinSummary } from "../lib/checkinSummary";

// Shared with home-page.tsx, which already fetches this same "my profile" row
// for its own purposes (expired-plan banner, etc.) — reusing the key means
// both consumers share one cached request instead of firing it twice.
export const LOGGED_USER_DETAILS_QUERY_KEY = ["get_mydetails"];

// Invalidating with just this prefix (TanStack Query matches array keys as a
// prefix by default) refreshes both the daily and weekly summary in one call
// — see updates-page.tsx / home-page.tsx's own save handlers.
export const CHECKIN_SUMMARY_KEY_PREFIX = ["checkin-summary"];

export const CHECKIN_SUMMARY_QUERY_KEYS = {
  daily: [...CHECKIN_SUMMARY_KEY_PREFIX, "daily"] as const,
  weekly: [...CHECKIN_SUMMARY_KEY_PREFIX, "weekly"] as const,
  profile: LOGGED_USER_DETAILS_QUERY_KEY,
};

export interface CheckinSummaryResult {
  isLoading: boolean;
  isError: boolean;
  /** False while data hasn't resolved, or the client isn't currently active —
   * either way the caller should render nothing rather than guess. */
  isReady: boolean;
  daily: DailyCheckinSummary | null;
  weekly: WeeklyCheckinSummary | null;
  /** True once every expected check-in is accounted for — the summary card
   * should render nothing in this state (req: "no pending warning ... appears"). */
  allCaughtUp: boolean;
  refresh: () => void;
}

export function useCheckinSummary(): CheckinSummaryResult {
  const queryClient = useQueryClient();

  const dailyQuery = useQuery<IDailyStats[]>({
    queryKey: CHECKIN_SUMMARY_QUERY_KEYS.daily,
    queryFn: () => getDailyUpdate({ showEmpty: true }).then(res => res.data.data),
  });

  const weeklyQuery = useQuery<IBodyMeasurement[]>({
    queryKey: CHECKIN_SUMMARY_QUERY_KEYS.weekly,
    queryFn: () => getWeeklyUpdate({ limited: true }).then(res => res.data.data),
  });

  const profileQuery = useQuery<Partial<IUser> | null>({
    queryKey: CHECKIN_SUMMARY_QUERY_KEYS.profile,
    queryFn: () => getLoggedUserDetails(0).then((res) => {
      const data = res.data.data as Partial<IUser>[] | undefined;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    }),
  });

  const isLoading = dailyQuery.isLoading || weeklyQuery.isLoading || profileQuery.isLoading;
  const isError = dailyQuery.isError || weeklyQuery.isError || profileQuery.isError;

  // Only ever compute/show the summary for a currently-active client — there's
  // no persisted history of past pause/resume windows to reconstruct which
  // *earlier* days were eligible (see MAX_LOOKBACK_DAYS note in
  // lib/checkinSummary.ts), so a client who isn't active right now gets no
  // catch-up nudge rather than a potentially-wrong one.
  const activeStatus = profileQuery.data?.ActiveStatus;
  const isActiveClient = activeStatus == null || activeStatus === ACCESS_STATUS.ACTIVE.NUMBER;

  const isReady = !isLoading && !isError && isActiveClient;

  const daily = isReady && dailyQuery.data
    ? computeDailySummary(dailyQuery.data, todayDateString(), profileQuery.data?.StartDate)
    : null;
  const weekly = isReady && weeklyQuery.data
    ? computeWeeklySummary(weeklyQuery.data, todayDateString())
    : null;

  const allCaughtUp = !!daily && !!weekly &&
    daily.todayComplete && daily.missingDays.length === 0 && !weekly.due;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: CHECKIN_SUMMARY_QUERY_KEYS.daily });
    queryClient.invalidateQueries({ queryKey: CHECKIN_SUMMARY_QUERY_KEYS.weekly });
    queryClient.invalidateQueries({ queryKey: CHECKIN_SUMMARY_QUERY_KEYS.profile });
  };

  return { isLoading, isError, isReady, daily, weekly, allCaughtUp, refresh };
}
