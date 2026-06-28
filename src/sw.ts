/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

declare const self: ServiceWorkerGlobalScope;

// ── Workbox caching ───────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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

onBackgroundMessage(messaging, (payload) => {
  // Data-only messages: read from payload.data
  const d     = payload.data ?? {};
  const title = d['title'] ?? payload.notification?.title ?? 'FitwithPK';
  const body  = d['body']  ?? payload.notification?.body  ?? 'You have a new notification';
  const icon  = d['icon']  ?? '/icons/icon-192x192.png';
  const badge = d['badge'] ?? '/icons/icon-72x72.png';

  self.registration.showNotification(title, {
    body,
    icon,
    badge,
    silent: false,
    data: d,
  });
});

// ── Notification click ────────────────────────────────────────────
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/student-dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return (client as any).focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
