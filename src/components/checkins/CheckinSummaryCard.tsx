// "Your check-ins" — the compact, actionable summary at the top of the
// client dashboard. See lib/checkinSummary.ts for the counting rules and
// hooks/use-checkin-summary.ts for how the data behind it is fetched.
import React, { useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, CalendarClock, ChevronRight } from "lucide-react";
import { useCheckinSummary } from "../../hooks/use-checkin-summary";
import { RENDER_URL } from "../../common/Urls";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../ui/dialog";

// Deep-links into the dedicated Updates page with a date/tab preselected —
// read by updates-page.tsx on mount (see its own useEffect for ?date/?tab).
function updatesUrl(opts: { date?: string; tab?: "daily" | "weekly" }): string {
  const params = new URLSearchParams();
  if (opts.date) params.set("date", opts.date);
  if (opts.tab) params.set("tab", opts.tab);
  const qs = params.toString();
  return qs ? `${RENDER_URL.STUDENT_UPDATES}?${qs}` : RENDER_URL.STUDENT_UPDATES;
}

// "2 previous daily check-ins are missing: Monday and Tuesday." — spells out
// the days inline while there are only a couple, falls back to a plain count
// once there are more (still fully listed in the "Review missing days" sheet).
function missingDaysLine(labels: string[]): string {
  const count = labels.length;
  const noun = count === 1 ? "check-in is" : "check-ins are";
  if (count <= 2) {
    return `${count} previous daily ${noun} missing: ${labels.join(" and ")}.`;
  }
  return `${count} previous daily ${noun} missing.`;
}

export default function CheckinSummaryCard() {
  const [, navigate] = useLocation();
  const { isLoading, isError, isReady, daily, weekly, allCaughtUp } = useCheckinSummary();
  const [reviewOpen, setReviewOpen] = useState(false);

  // Loading/error/inactive/all-caught-up all render nothing — never a false
  // "missing" claim while data hasn't resolved (req 11), and no empty-praise
  // banner once everything's actually done (req: "no pending warning ... appears").
  if (isLoading || isError || !isReady || !daily || !weekly || allCaughtUp) return null;

  const goToToday = () => navigate(updatesUrl({ date: daily.todayStr, tab: "daily" }));
  const goToWeekly = () => navigate(updatesUrl({ tab: "weekly" }));
  const goToDay = (day: string) => { setReviewOpen(false); navigate(updatesUrl({ date: day, tab: "daily" })); };

  return (
    <>
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Your check-ins</h2>

        <div className="space-y-1.5 mb-3">
          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
            {daily.todayComplete ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            )}
            {daily.todayComplete ? "Today's check-in is complete." : "Today's check-in is ready."}
          </p>

          {daily.missingDays.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
              {missingDaysLine(daily.missingDays.map(d => d.weekdayLabel))}
            </p>
          )}

          {weekly.due && (
            <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 shrink-0" />
              Your weekly check-in is due.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!daily.todayComplete && (
            <button
              onClick={goToToday}
              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full px-3 py-1.5 transition-colors"
            >
              Complete today's check-in
            </button>
          )}
          {daily.missingDays.length > 0 && (
            <button
              onClick={() => setReviewOpen(true)}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              Review missing days
            </button>
          )}
          {weekly.due && (
            <button
              onClick={goToWeekly}
              className="text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-full px-3 py-1.5 transition-colors"
            >
              Complete weekly check-in
            </button>
          )}
        </div>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Missing check-ins</DialogTitle>
            <DialogDescription>
              Pick a date to fill it in — or leave it and it'll stay listed here until you do.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
            {daily.missingDays.map(({ day, weekdayLabel }) => (
              <button
                key={day}
                onClick={() => goToDay(day)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
              >
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{weekdayLabel}</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
