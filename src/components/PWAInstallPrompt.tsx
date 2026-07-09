import React, { useEffect, useState } from 'react';

const DISMISS_KEY = 'pwaInstallDismissedAt';
const DISMISS_DAYS = 7;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function recentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const elapsedDays = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
  return elapsedDays < DISMISS_DAYS;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // Pick up an event captured before this component (or React) mounted.
    const existing = (window as any).__pwaInstallEvent;
    if (existing) {
      setDeferredPrompt(existing);
      setIsVisible(true);
    } else if (isIos()) {
      setShowIosHint(true);
      setIsVisible(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallEvent = e;
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      (window as any).__pwaInstallEvent = null;
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setIsVisible(false);
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-300 z-50 max-w-xs">
      <div className="flex items-start space-x-3">
        <img
          src="/icons/icon-48x48.png"
          alt="FitwithPK"
          className="w-10 h-10 flex-shrink-0"
        />
        <div>
          <h3 className="font-semibold text-gray-900">Install FitwithPK</h3>
          <p className="text-sm text-gray-600 mt-1">
            {showIosHint
              ? 'Tap the Share icon, then "Add to Home Screen"'
              : 'Get the full app experience'}
          </p>
          <div className="flex space-x-2 mt-3">
            {!showIosHint && (
              <button
                onClick={handleInstall}
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Install
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
