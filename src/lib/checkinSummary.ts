// Pure calculation logic behind the client dashboard's "Your check-ins"
// summary (missing daily check-ins + weekly-due reminder). Kept separate from
// the component/hook so the counting rules are easy to unit-reason-about and
// to keep in sync with the acceptance criteria they were written against.
//
// Dates everywhere here are the app's existing "DD-MM-YYYY" string convention
// (see tbl_daily_status.Day / tbl_weekly_status.DateRange) — never Date
// objects — so string equality/sorting stays unambiguous across callers.
import moment from "moment";
import { IDailyStats } from "../interface/IDailyUpdates";
import { IBodyMeasurement } from "../interface/IBodyMeasurement";

const DATE_FMT = "DD-MM-YYYY";

// A day only counts as "missing" once it's fully in the past — never today,
// and never a date the coaching relationship wasn't active for yet.
export interface MissingDay {
  day: string;        // "DD-MM-YYYY"
  weekdayLabel: string; // "Monday" (or "Mon, 3 Aug" once it's more than a week old)
}

export interface DailyCheckinSummary {
  todayStr: string;
  todayRecord: IDailyStats | null;
  todayComplete: boolean;
  missingDays: MissingDay[];
}

export interface WeeklyCheckinSummary {
  due: boolean;
  latestDateRange: string | null;
  nextDueDate: string | null; // "DD-MM-YYYY" — latestDateRange + 7 days, once one exists
}

// Safety net only — without a persisted history of past pause/reactivation
// windows (tbl_users.ActiveStatus only ever holds the *current* status), a
// client who returns after a very long dormancy has no reliable lower bound
// besides this. Keeps the feature "compact" per its own goal rather than
// surfacing months of unrecoverable gaps.
const MAX_LOOKBACK_DAYS = 30;

/** Every field the admin's own "complete" check requires — see
 * lib/dailyUpdateStatus.ts. Duplicated (not imported) because that helper's
 * signature is admin-shaped (IUpdatesForUser + an explicit reviewDate to
 * match against); this just needs "does this row have everything filled". */
function isRowComplete(row: IDailyStats): boolean {
  return (
    row.Steps != null &&
    row.Water != null &&
    row.Diet_Follow != null &&
    (row.WorkOut_Follow != null || row.WorkOut != null) &&
    row.Weight != null &&
    row.Sleep != null
  );
}

/**
 * Which past days between the client's last saved record and today have no
 * daily-status row at all. "Missing" here means *no submission whatsoever*
 * (IdStats absent) — not "submitted but incomplete". A client who logs some
 * fields for a day made a deliberate entry for it; nagging them again over a
 * partial field would contradict "leave those dates unanswered" (req 7).
 *
 * @param records        This client's real, unpadded daily-status rows (any
 *                        order) — i.e. getDailyUpdate({ showEmpty: true }).
 * @param todayStr        "DD-MM-YYYY" for today, in the caller's timezone.
 * @param earliestEligible Optional lower bound (e.g. the current coaching
 *                          plan's StartDate) — a day before this was never
 *                          expected, regardless of how old the client's
 *                          account is.
 */
export function computeDailySummary(
  records: IDailyStats[],
  todayStr: string,
  earliestEligible?: string | null
): DailyCheckinSummary {
  const today = moment(todayStr, DATE_FMT, true);
  const byDay = new Map<string, IDailyStats>();
  for (const r of records) {
    if (r.Day) byDay.set(r.Day, r);
  }

  const todayRecord = byDay.get(todayStr) ?? null;
  const todayComplete = !!todayRecord && isRowComplete(todayRecord);

  // Anchor the gap-walk on the most recent PAST record (never today) — this
  // is what makes the calculation come from saved records rather than "when
  // the client last opened the app" (req 1): a client who never submitted
  // anything has nothing to walk back from, so they see no missing days at
  // all, exactly like a client who just finished their very first day.
  let mostRecentPast: moment.Moment | null = null;
  for (const day of byDay.keys()) {
    if (day === todayStr) continue;
    const m = moment(day, DATE_FMT, true);
    if (!m.isValid() || !m.isBefore(today, "day")) continue;
    if (!mostRecentPast || m.isAfter(mostRecentPast)) mostRecentPast = m;
  }

  if (!mostRecentPast) {
    return { todayStr, todayRecord, todayComplete, missingDays: [] };
  }

  let walkStart = mostRecentPast.clone().add(1, "day");
  const cappedStart = today.clone().subtract(MAX_LOOKBACK_DAYS, "days");
  if (walkStart.isBefore(cappedStart, "day")) walkStart = cappedStart;
  if (earliestEligible) {
    const eligible = moment(earliestEligible, DATE_FMT, true);
    if (eligible.isValid() && walkStart.isBefore(eligible, "day")) walkStart = eligible.clone();
  }

  const missingDays: MissingDay[] = [];
  const cursor = walkStart.clone();
  while (cursor.isBefore(today, "day")) {
    const dayStr = cursor.format(DATE_FMT);
    if (!byDay.has(dayStr)) {
      missingDays.push({
        day: dayStr,
        weekdayLabel: today.diff(cursor, "days") <= 7 ? cursor.format("dddd") : cursor.format("ddd, MMM D"),
      });
    }
    cursor.add(1, "day");
  }

  return { todayStr, todayRecord, todayComplete, missingDays };
}

/**
 * A weekly check-in is "due" once 7 days have passed since the client's own
 * last weekly submission — never "since the start of the calendar week" (the
 * spec explicitly rules that out), and never before a first weekly cadence
 * has actually been established by one real submission.
 */
export function computeWeeklySummary(
  weeklyRecords: IBodyMeasurement[],
  todayStr: string
): WeeklyCheckinSummary {
  const today = moment(todayStr, DATE_FMT, true);

  let latest: moment.Moment | null = null;
  for (const r of weeklyRecords) {
    if (!r.DateRange) continue;
    const m = moment(r.DateRange, DATE_FMT, true);
    if (!m.isValid()) continue;
    if (!latest || m.isAfter(latest)) latest = m;
  }

  if (!latest) {
    return { due: false, latestDateRange: null, nextDueDate: null };
  }

  const nextDue = latest.clone().add(7, "days");
  return {
    due: !today.isBefore(nextDue, "day"),
    latestDateRange: latest.format(DATE_FMT),
    nextDueDate: nextDue.format(DATE_FMT),
  };
}

/** "DD-MM-YYYY" for today in the browser's own timezone — every Day/DateRange
 * value in this app is already written client-side the same way (see
 * updates-page.tsx / home-page.tsx), so this is the one definition of "today"
 * consistent with the records being compared against it (req 4). */
export function todayDateString(): string {
  return moment().format(DATE_FMT);
}
