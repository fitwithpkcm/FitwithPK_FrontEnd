export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function getDeferredInstallEvent(): any {
  return (window as any).__pwaInstallEvent ?? null;
}

export function clearDeferredInstallEvent(): void {
  (window as any).__pwaInstallEvent = null;
}

/** Triggers the native "Install app?" prompt (Chrome/Edge/Android only).
 * Returns true if the native prompt was shown, false if unavailable (caller should fall back). */
export async function triggerNativeInstallPrompt(): Promise<boolean> {
  const deferred = getDeferredInstallEvent();
  if (!deferred) return false;

  deferred.prompt();
  await deferred.userChoice;
  clearDeferredInstallEvent();
  return true;
}
