import { Workbox } from 'workbox-window';

export function registerSW() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const wb = new Workbox('/sw.js');

    // sw.ts calls self.skipWaiting()/clients.claim() on its own, so a new
    // service worker takes control without waiting for this tab to close.
    // But the page's already-loaded JS doesn't know a new version exists —
    // without this reload, users keep running stale code (stale API calls,
    // stale cache keys, etc.) until they happen to refresh manually.
    let hasReloaded = false;
    wb.addEventListener('controlling', () => {
      if (hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    });

    wb.register()
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  }
}