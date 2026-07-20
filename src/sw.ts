/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { idbSave, idbSetPendingNav } from './lib/notif-idb';

declare const self: ServiceWorkerGlobalScope;

// ── Workbox caching ───────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Serve index.html for ALL navigation requests (SPA deep-link support).
// Without this, openWindow('/student-supplements') falls through to the
// network and may fail or return a wrong page on some hosts.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Firebase Messaging (background messages) ──────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDZZS4iVXjvdZ88rpAga-59k1hcVEmdKHA",
  authDomain: "fitwithpk-8d860.firebaseapp.com",
  projectId: "fitwithpk-8d860",
  storageBucket: "fitwithpk-8d860.firebasestorage.app",
  messagingSenderId: "1027635962068",
  appId: "1:1027635962068:web:55345314557de67a27db41",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// ── Badge count stored in SW (survives background) ───────────────
let badgeCount = 0;

function setBadge(count: number) {
  badgeCount = count;
  if ('setAppBadge' in (self.navigator as any)) {
    (self.navigator as any).setAppBadge(count).catch(() => {});
  }
}

onBackgroundMessage(messaging, (payload) => {
  // Data-only messages: read from payload.data
  const d     = payload.data ?? {};
  const title = d['title'] ?? payload.notification?.title ?? 'FitwithPK';
  const body  = d['body']  ?? payload.notification?.body  ?? 'You have a new notification';
  const icon  = d['icon']  ?? '/icons/icon-192x192.png';
  const badge = d['badge'] ?? '/icons/icon-72x72.png';

  // Persist to IDB so the app can show it in the notifications page
  const notif = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    body,
    receivedAt: Date.now(),
    read: false,
    url: d['url'] ?? '/student-updates',
  };
  idbSave(notif).catch(() => {});

  // Increment badge on every incoming background notification
  setBadge(badgeCount + 1);

  self.registration.showNotification(title, {
    body,
    icon,
    badge,
    silent: false,
    data: { ...d, notifId: notif.id },
  });

  // Mirror the already-persisted notif to any open tabs so their in-app list
  // updates live. Tabs must NOT re-save it themselves — this SW handler is the
  // single place a message gets written to IDB, since data-only FCM messages
  // reach this handler regardless of foreground/background state.
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((c) => c.postMessage({ type: 'NOTIFICATION_RECEIVED', notif }));
  });
});

// ── Notification click ────────────────────────────────────────────
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  // Supplement reminders go to the supplements page.
  // FCM backend notifications may provide a url in data; fall back to supplements.
  const url = event.notification.data?.url ?? '/student-supplements';

  // Save the target URL to IDB so the app can reliably navigate to it on startup/focus,
  // even if a SW auto-update causes a page reload that would otherwise reset the URL.
  const absoluteUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    idbSetPendingNav(url).catch(() => {}).then(() =>
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
        const appClient = clients.find(c => c.url.startsWith(self.location.origin)) as any;

        if (appClient) {
          appClient.postMessage({ type: 'RELOAD_NOTIFICATIONS' });
          return appClient.focus();
        }
        return self.clients.openWindow(absoluteUrl);
      })
    )
  );
});
