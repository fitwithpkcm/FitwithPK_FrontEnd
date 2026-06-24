/**
 * push-handler.js
 * Injected into the Workbox-generated service worker via importScripts.
 * Handles Web Push notifications sent by the backend when a coach clicks "Send Reminder".
 */

// ── Receive a push message from the server ────────────────────────────────────
self.addEventListener('push', function (event) {
  var payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : '' };
  }

  var title   = payload.title || 'FitwithPK Reminder 💪';
  var options = {
    body:      payload.body  || "Your coach wants you to log today's update.",
    icon:      '/icons/icon-192x192.png',
    badge:     '/icons/icon-96x96.png',
    tag:       'coach-reminder',   // replaces any existing reminder notification
    renotify:  true,
    data:      { url: payload.url || '/student-dashboard' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Tap on notification: open / focus the app ─────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var targetUrl =
    (event.notification.data && event.notification.data.url)
      ? event.notification.data.url
      : '/student-dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        // Re-focus if the app is already open
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
