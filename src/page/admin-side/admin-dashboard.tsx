import React, { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/use-auth";
import { useFcmNotification } from "../../hooks/use-fcm-notification";
import { RENDER_URL } from "../../common/Urls";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import {
  ArrowRightLeft,
  BarChart2,
  Bell,
  ClipboardCheck,
  EuroIcon,
  MessageCircle,
  Plus,
  Target,
  Trash2,
  UserCheck,
  Users,
  TrendingUp,
  Dumbbell,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { IUser, SuperAdminResponse } from "../../interface/models/User";
import {
  getUserListForACoach,
  getUserListWithUpdates_ForCoach,
  isSuperAdminApi,
} from "../../services/AdminServices";
import { getPendingQueriesForCoach, IPendingMealQuery } from "../../services/MealQueryService";
import { ACCESS_STATUS, BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { IUpdatesForUser } from "../../interface/IDailyUpdates";
import { getReviewDate, isDailyUpdateComplete } from "../../lib/dailyUpdateStatus";
import { useTheme } from "next-themes";

export default function AdminDashboard() {
  const data = useAuth();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const currentDate = new Date();
  const { user } = useAuth();
  const { status: pushStatus, requestPermission: enablePush } = useFcmNotification();
  const [pushBannerDismissed, setPushBannerDismissed] = useState(false);

  useEffect(() => {
    setBaseUrl(BASE_URL);
    setTheme("light");
  }, []);

  const { data: coach_client_list } = useQuery<IUser[]>({
    queryKey: ["coach-userlist-dashboard", user?.info?.EmailID],
    queryFn: () => getUserListForACoach(null).then((res) => res.data.data),
  });

  // Reviews the same "most recently completed day" as the Check Updates detail
  // page (simple-tracking-view.tsx) — see lib/dailyUpdateStatus for why yesterday.
  const reviewDate = getReviewDate(currentDate);

  const { data: UserListWithUpdates } = useQuery<IUpdatesForUser[]>({
    queryKey: ["coach-userlist-updates-dashboard", user?.info?.EmailID, reviewDate],
    queryFn: () =>
      getUserListWithUpdates_ForCoach({
        Day: reviewDate,
      }).then((res) => res.data.data),
  });

  const { data: isSuperAdmin } = useQuery<SuperAdminResponse>({
    queryKey: ["is-super-admin"],
    queryFn: () => isSuperAdminApi(0).then((res) => res.data.data),
  });

  const { data: pendingQueries = [] } = useQuery<IPendingMealQuery[]>({
    queryKey: ["admin-pending-queries"],
    queryFn: async () => {
      const res = await getPendingQueriesForCoach() as any;
      const d = res.data?.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 0,
    refetchInterval: 60000,
  });

  const [quickNotes, setQuickNotes] = useState<string[]>([
    "Weekly progress reviews due this Friday",
    "New nutrition plans available",
    "Check client feedback messages",
  ]);
  const [newNote, setNewNote] = useState("");

  const addQuickNote = () => {
    if (newNote.trim()) {
      setQuickNotes([...quickNotes, newNote.trim()]);
      setNewNote("");
    }
  };

  const deleteQuickNote = (index: number) => {
    setQuickNotes(quickNotes.filter((_, i) => i !== index));
  };

  const getActiveUserCount = (clientList: IUser[]): number => {
    return clientList.filter((e) => e.ActiveStatus === ACCESS_STATUS.ACTIVE.NUMBER).length;
  };

  const getUpdatedCount = (list: IUpdatesForUser[]) => {
    return list?.filter((u) => isDailyUpdateComplete(u, reviewDate)).length ?? 0;
  };

  const totalClients = coach_client_list?.length ?? 0;
  const activeClients = getActiveUserCount(coach_client_list ?? []);
  const updatedYesterday = getUpdatedCount(UserListWithUpdates ?? []);


  const hourOfDay = currentDate.getHours();
  const greeting =
    hourOfDay < 12 ? "Good morning" : hourOfDay < 17 ? "Good afternoon" : "Good evening";
  const coachName = user?.info?.FirstName ?? "Coach";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-600 pt-safe-top">
        <div className="px-5 pt-5 pb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">FitwithPK</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications bell */}
              <button
                onClick={() => setLocation(RENDER_URL.ADMIN_NOTIFICATIONS)}
                className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
              >
                <Bell className="w-4 h-4 text-white" />
                {pendingQueries.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {pendingQueries.length > 9 ? "9+" : pendingQueries.length}
                  </span>
                )}
              </button>
              {/* Coach avatar */}
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <span className="text-white font-bold text-sm">{coachName.charAt(0)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-blue-200 text-sm">{greeting},</p>
            <h1 className="text-white text-2xl font-bold">{coachName} 👋</h1>
          </div>
        </div>

        {/* Stat strip */}
        <div className="bg-white dark:bg-gray-900 mx-4 -mb-5 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
          {[
            { label: "Total Clients", value: totalClients, color: "text-gray-900 dark:text-white" },
            { label: "Active", value: activeClients, color: "text-green-600" },
            { label: "Updated Yesterday", value: updatedYesterday, color: "text-blue-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="py-4 flex flex-col items-center">
              <span className={`text-2xl font-extrabold ${color}`}>{value}</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Main */}
      <main className="px-4 pt-10 space-y-6">
        {/* Push notification banner — visible until enabled or dismissed */}
        {pushStatus !== 'granted' && !pushBannerDismissed && (
          <div className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 border ${
            pushStatus === 'denied'
              ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
              : pushStatus === 'requesting'
              ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900'
              : 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">
                {pushStatus === 'denied' ? '🚫' : pushStatus === 'requesting' ? '⏳' : '🔔'}
              </span>
              <span className={
                pushStatus === 'denied' ? 'text-red-800 dark:text-red-300'
                : pushStatus === 'requesting' ? 'text-blue-700 dark:text-blue-300'
                : 'text-orange-800 dark:text-orange-300'
              }>
                {pushStatus === 'denied' ? (
                  <span>
                    Notifications blocked. <strong>To fix:</strong> open your browser Settings → Site Settings → Notifications → find this site → set to <strong>Allow</strong>, then reload the app.
                  </span>
                ) : pushStatus === 'requesting' ? (
                  'Enabling notifications…'
                ) : (
                  'Enable notifications to get alerts when clients submit updates or ask questions.'
                )}
              </span>
            </div>
            {(pushStatus === 'idle' || pushStatus === 'error') && (
              <button
                onClick={enablePush}
                className="text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 px-4 py-2 rounded-lg flex-shrink-0"
              >
                Enable
              </button>
            )}
            <button
              onClick={() => setPushBannerDismissed(true)}
              className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-black/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Client overview cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocation(RENDER_URL.ADMIN_CLIENT_MANAGEMENT)}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
          >
            <div className="w-10 h-10 bg-green-100 dark:bg-green-950/50 rounded-xl flex items-center justify-center mb-3">
              <Users className="text-green-600" size={20} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {activeClients}
              <span className="text-base font-normal text-gray-400">/{totalClients}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Active Clients</p>
          </button>

          <button
            onClick={() => setLocation(RENDER_URL.ADMIN_UPDATES)}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
          >
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-xl flex items-center justify-center mb-3">
              <ClipboardCheck className="text-blue-600" size={20} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {updatedYesterday}
              <span className="text-base font-normal text-gray-400">/{totalClients}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Updated Yesterday</p>
          </button>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: ClipboardCheck,
                label: "Check Updates",
                sub: "View recent client progress",
                color: "bg-blue-100 dark:bg-blue-950/50 text-blue-600",
                route: RENDER_URL.ADMIN_UPDATES,
              },
              {
                icon: Target,
                label: "Targets",
                sub: "Set goals & manage plans",
                color: "bg-purple-100 dark:bg-purple-950/50 text-purple-600",
                route: RENDER_URL.ADMIN_TARGETS,
              },
              {
                icon: ArrowRightLeft,
                label: "NutriSwap",
                sub: "Manage food alternatives",
                color: "bg-orange-100 dark:bg-orange-950/50 text-orange-600",
                route: RENDER_URL.ADMIN_NUTRISWAP,
              },
              {
                icon: BarChart2,
                label: "Analytics",
                sub: "View detailed metrics",
                color: "bg-green-100 dark:bg-green-950/50 text-green-600",
                route: RENDER_URL.ADMIN_ANALYTICS,
              },
            ].map(({ icon: Icon, label, sub, color, route }) => (
              <button
                key={label}
                onClick={() => setLocation(route)}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${color}`}>
                  <Icon size={18} />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
              </button>
            ))}

            {isSuperAdmin?.IsSuperAdmin === 1 && (
              <>
                <button
                  onClick={() => setLocation(RENDER_URL.ADMIN_COACH_MANAGE)}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
                >
                  <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center mb-2.5 text-indigo-600">
                    <UserCheck size={18} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Coaches</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Manage coach profiles</p>
                </button>

                <button
                  onClick={() => setLocation(RENDER_URL.ADMIN_COACH_PRICING)}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
                >
                  <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center mb-2.5 text-indigo-600">
                    <EuroIcon size={18} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Pricing Plans</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Manage subscriptions</p>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Notes */}
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">Quick Notes</h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a quick note…"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  onKeyDown={(e) => e.key === "Enter" && addQuickNote()}
                />
                <button
                  onClick={addQuickNote}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                  <Plus size={15} />
                  Add
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {quickNotes.map((note, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{note}</span>
                  </div>
                  <button
                    onClick={() => deleteQuickNote(index)}
                    className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {quickNotes.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">
                  No notes yet. Add your first note above!
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Chat FAB — navigates to Messenger page */}
      <button
        onClick={() => setLocation(RENDER_URL.ADMIN_NOTIFICATIONS)}
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
      >
        <MessageCircle className="h-6 w-6 text-white" />
        {pendingQueries.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {pendingQueries.length > 9 ? "9+" : pendingQueries.length}
          </span>
        )}
      </button>

      <MobileAdminNav />
    </div>
  );
}
