import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Check, Flame, Loader2, Trophy } from "lucide-react";
import moment from "moment";

import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { MobileNav } from "../../components/layout/mobile-nav";
import { HabitHeatmap } from "../../components/habits/habit-heatmap";
import { HabitMonthCalendar } from "../../components/habits/habit-month-calendar";
import { HabitTrendBars } from "../../components/habits/habit-trend-bars";
import { BadgeShelf } from "../../components/habits/badge-shelf";
import { HabitDaySheet } from "../../components/habits/habit-day-sheet";
import {
  getMyHabitBadges, getMyHabitHistory, getMyHabitStats,
} from "../../services/HabitService";
import {
  IHabitBadgesResponse, IHabitDaySummary, IHabitStats, IHabitTrend,
} from "../../interface/IHabit";

const WIRE = "DD-MM-YYYY";
const TREND_DAYS = 30;

type Tab = "overview" | "calendar" | "badges";

export default function HabitsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);

  // A year of history covers the heatmap, the calendar's back-paging and the
  // best-streak figure in one fetch.
  const { data: historyRes, isLoading: historyLoading } = useQuery<{ History: IHabitDaySummary[] }>({
    queryKey: ["my-habit-history"],
    queryFn: () =>
      getMyHabitHistory({
        FromDate: moment().subtract(365, "days").format(WIRE),
        ToDate: moment().format(WIRE),
      }).then((res) => res.data.data),
  });

  const { data: statsRes, isLoading: statsLoading } = useQuery<{ Stats: IHabitStats; Trends: IHabitTrend[] }>({
    queryKey: ["my-habit-stats", TREND_DAYS],
    queryFn: () => getMyHabitStats({ days: TREND_DAYS }).then((res) => res.data.data),
  });

  const { data: badgesRes } = useQuery<IHabitBadgesResponse>({
    queryKey: ["my-habit-badges"],
    queryFn: () => getMyHabitBadges().then((res) => res.data.data),
  });

  const history = historyRes?.History ?? [];
  const stats = statsRes?.Stats;
  const trends = statsRes?.Trends ?? [];
  const loading = historyLoading || statsLoading;

  return (
    <div className="min-h-screen bg-gray-50 pb-28 dark:bg-gray-950">
      <header className="bg-gradient-to-r from-blue-700 to-blue-600 px-4 pb-5 pt-6 text-white">
        <h1 className="text-xl font-bold">Your habits</h1>
        <p className="mt-0.5 text-sm text-blue-100">Streaks, history and badges</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <StatTile icon={<Flame className="h-4 w-4" />} label="Current streak" value={stats ? `${stats.CurrentStreak}` : "—"} suffix="days" />
          <StatTile icon={<Trophy className="h-4 w-4" />} label="Best streak" value={stats ? `${stats.BestStreak}` : "—"} suffix="days" />
          <StatTile icon={<Check className="h-4 w-4" />} label="Perfect days" value={stats ? `${stats.PerfectDays}` : "—"} />
          <StatTile icon={<Award className="h-4 w-4" />} label="Last 30 days" value={stats ? `${stats.Last30Percent}` : "—"} suffix="%" />
        </div>
      </header>

      <nav className="flex border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" role="tablist">
        {([["overview", "Overview"], ["calendar", "Calendar"], ["badges", "Badges"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
              tab === key
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : trends.length === 0 && history.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center dark:bg-gray-900">
            <Trophy className="mx-auto h-9 w-9 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">No habits yet</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Your coach hasn't assigned any habits. Once they do, they'll show up on your home page.
            </p>
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <div className="space-y-4">
                <Card title="Last 12 weeks">
                  <HabitHeatmap history={history} weeks={12} onSelectDay={setSelectedDay} selectedDay={selectedDay} />
                </Card>
                <Card title="Habit by habit">
                  <HabitTrendBars trends={trends} days={TREND_DAYS} />
                </Card>
              </div>
            )}

            {tab === "calendar" && (
              <Card>
                <HabitMonthCalendar history={history} onSelectDay={setSelectedDay} selectedDay={selectedDay} />
                <p className="mt-3 text-center text-[11px] text-gray-400">Tap a day to see the breakdown</p>
              </Card>
            )}

            {tab === "badges" && (
              <Card>
                <BadgeShelf earned={badgesRes?.Earned ?? []} locked={badgesRes?.Locked ?? []} />
              </Card>
            )}
          </>
        )}
      </main>

      <HabitDaySheet day={selectedDay} onClose={() => setSelectedDay(null)} />
      <MobileNav />
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────────────

function StatTile({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-blue-100">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-0.5 text-xl font-bold">
        {value}
        {!!suffix && <span className="ml-1 text-xs font-normal text-blue-100">{suffix}</span>}
      </p>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {!!title && <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">{title}</h2>}
      {children}
    </section>
  );
}
