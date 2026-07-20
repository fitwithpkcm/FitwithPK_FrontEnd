import React from "react";
import { Bell, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { MobileNav } from "../../components/layout/mobile-nav";
import { useNotifications, AppNotification } from "../../hooks/use-notifications";

function timeAgo(ms: number): string {
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isNew(n: AppNotification): boolean {
  return Date.now() - n.receivedAt < 24 * 60 * 60 * 1000; // within last 24h
}

function NotifRow({ n, onTap }: { n: AppNotification; onTap: (url: string) => void }) {
  const initials = n.title
    .split(" ")
    .slice(0, 2)
    .map(w => w[0] ?? "")
    .join("")
    .toUpperCase() || "FK";

  return (
    <div
      onClick={() => n.url && onTap(n.url)}
      className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer active:opacity-70 ${isNew(n) ? "bg-blue-50 dark:bg-blue-950/20" : "bg-white dark:bg-gray-900"}`}
    >
      {/* Avatar / icon */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <span className="text-white text-sm font-bold">{initials}</span>
        </div>
        {/* Small bell badge */}
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-600 border-2 border-white dark:border-gray-900 flex items-center justify-center">
          <Bell size={10} className="text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white leading-snug">
          <span className="font-bold">{n.title}</span>
          {n.body ? <span className="font-normal text-gray-700 dark:text-gray-300"> {n.body}</span> : null}
        </p>
        <p className={`text-xs mt-1 font-semibold ${isNew(n) ? "text-blue-500" : "text-gray-400"}`}>
          {timeAgo(n.receivedAt)}
        </p>
      </div>
    </div>
  );
}

// ── Notifications Panel — reusable list UI ─────────────────────────
// Used both by the standalone route below (NotificationsPage) and embedded
// directly inside a floating dialog (e.g. the admin dashboard's bell icon),
// so it doesn't assume it owns the whole viewport/route.
export function NotificationsPanel({ onNavigate }: { onNavigate?: (url: string) => void }) {
  const { notifications, markAllRead, clearAll } = useNotifications();
  const [, navigate] = useLocation();
  const handleTap = onNavigate ?? navigate;

  // Mark all read when panel mounts
  React.useEffect(() => { markAllRead(); }, []);

  const newNotifs = notifications.filter(isNew);
  const earlierNotifs = notifications.filter(n => !isNew(n));

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 flex-shrink-0">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 size={13} />
              Clear all
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 gap-4 text-gray-300 dark:text-gray-600">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Bell size={36} />
            </div>
            <p className="text-base font-medium text-gray-400">No notifications yet</p>
            <p className="text-sm text-gray-300 dark:text-gray-600 text-center px-8">
              Updates and reminders will appear here.
            </p>
          </div>
        ) : (
          <div>
            {newNotifs.length > 0 && (
              <section>
                <p className="px-4 pt-4 pb-2 text-sm font-bold text-gray-900 dark:text-white">New</p>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {newNotifs.map(n => <NotifRow key={n.id} n={n} onTap={handleTap} />)}
                </div>
              </section>
            )}

            {earlierNotifs.length > 0 && (
              <section>
                <p className="px-4 pt-4 pb-2 text-sm font-bold text-gray-900 dark:text-white">Earlier</p>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {earlierNotifs.map(n => <NotifRow key={n.id} n={n} onTap={handleTap} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Standalone route — full-page shell around NotificationsPanel ───────────
export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <div className="pt-safe-top">
        <NotificationsPanel />
      </div>
      <MobileNav />
    </div>
  );
}
