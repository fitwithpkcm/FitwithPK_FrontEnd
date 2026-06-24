/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Workbox injects the precache manifest here at build time
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push notification handler ─────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  let title = 'FitwithPK';
  let body  = 'You have a new notification';
  let url   = '/';

  try {
    if (event.data) {
      const data = event.data.json();
      title = data.title ?? title;
      body  = data.body  ?? body;
      url   = data.url   ?? url;
    }
  } catch (_) {
    body = event.data?.text() ?? body;
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:      '/icons/icon-192x192.png',
      badge:     '/icons/icon-72x72.png',
      tag:       'coach-reminder',
      renotify:  true,
      data:      { url },
    })
  );
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationClickEvent) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
