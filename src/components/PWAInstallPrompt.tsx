import React, { useEffect, useState } from 'react';
import { isStandalone, isIos, getDeferredInstallEvent, clearDeferredInstallEvent } from '../lib/pwaInstall';

const DISMISS_KEY = 'pwaInstallDismissedAt';
const DISMISS_DAYS = 7;

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
    const existing = getDeferredInstallEvent();
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
      clearDeferredInstallEvent();
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
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none animate-in slide-in-from-bottom duration-300">
      <div className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-3">
        <img
          src="/icons/icon-48x48.png"
          alt="FitwithPK"
          className="w-11 h-11 rounded-xl flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm">Install FitwithPK</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {showIosHint
              ? 'Tap Share, then "Add to Home Screen"'
              : 'Add it to your home screen for quick access'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!showIosHint && (
            <button
              onClick={handleInstall}
              className="bg-blue-600 text-white px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
