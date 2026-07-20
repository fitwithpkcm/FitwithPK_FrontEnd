import { useEffect, useState, useCallback } from 'react';
import { idbSave, idbLoadAll, idbMarkAllRead, idbClearAll, StoredNotif } from '../lib/notif-idb';

export type AppNotification = StoredNotif;

function syncBadge(count: number) {
  if (!('setAppBadge' in navigator)) return;
  if (count > 0) {
    (navigator as any).setAppBadge(count).catch(() => {});
  } else {
    (navigator as any).clearAppBadge().catch(() => {});
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Load from IDB on mount (picks up background/lock-screen notifications)
  useEffect(() => {
    idbLoadAll().then(all => {
      setNotifications(all);
      const unread = all.filter(n => !n.read).length;
      syncBadge(unread);
    }).catch(() => {});
  }, []);

  const addNotification = useCallback((title: string, body: string, url?: string) => {
    const item: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      body,
      receivedAt: Date.now(),
      read: false,
      url,
    };
    idbSave(item).catch(() => {});
    setNotifications(prev => {
      const next = [item, ...prev].slice(0, 50);
      syncBadge(next.filter(n => !n.read).length);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    idbMarkAllRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    syncBadge(0);
  }, []);

  const clearAll = useCallback(() => {
    idbClearAll().catch(() => {});
    setNotifications([]);
    syncBadge(0);
  }, []);

  // Every incoming FCM message (foreground or background) is persisted exactly once,
  // by the service worker's onBackgroundMessage handler — data-only payloads reach it
  // regardless of whether a tab is focused. This listener only mirrors that already-saved
  // notif into in-app state; it must not re-save it, or every push would show up twice.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_RECEIVED' && event.data.notif) {
        const notif: AppNotification = event.data.notif;
        setNotifications(prev => {
          const next = [notif, ...prev].slice(0, 50);
          syncBadge(next.filter(n => !n.read).length);
          return next;
        });
      }
      if (event.data?.type === 'RELOAD_NOTIFICATIONS') {
        idbLoadAll().then(all => {
          setNotifications(all);
          syncBadge(all.filter(n => !n.read).length);
        }).catch(() => {});
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markAllRead, clearAll, addNotification };
}
