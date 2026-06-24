import { useEffect, useState } from 'react';
import { httpCall } from '../services/HttpService';
import { API_URL } from '../common/Urls';
import { VAPID_PUBLIC_KEY } from '../common/Constant';

export type PushStatus = 'idle' | 'subscribing' | 'subscribed' | 'denied' | 'unsupported' | 'error';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  await httpCall({
    url: API_URL.SAVE_PUSH_SUBSCRIPTION,
    method: 'post',
    data: subscription.toJSON(),
  });
  console.log('[Push] Subscription saved to backend');
}

async function doSubscribe(): Promise<PushStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  if (VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') return 'error';

  // Request permission — must be called in response to a user gesture in Firefox
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') return 'idle';

  const registration = await navigator.serviceWorker.ready;

  // Reuse existing subscription
  let sub = await registration.pushManager.getSubscription();
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  await saveSubscription(sub);
  return 'subscribed';
}

/**
 * Returns { status, subscribe }
 *  - status: current push subscription state
 *  - subscribe: call this from a button click to trigger subscription (works in all browsers)
 *
 * The hook also attempts auto-subscribe on mount (works in Chrome, may be silently
 * skipped in Firefox — in that case the user must click the Enable Notifications button).
 */
export function usePushNotification(): { status: PushStatus; subscribe: () => void } {
  const [status, setStatus] = useState<PushStatus>('idle');

  const subscribe = async () => {
    if (status === 'subscribed' || status === 'subscribing') return;
    setStatus('subscribing');
    try {
      const result = await doSubscribe();
      console.log('[Push] status →', result);
      setStatus(result);
    } catch (err) {
      console.warn('[Push] Subscribe error:', err);
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] status → unsupported');
      setStatus('unsupported');
      return;
    }
    console.log('[Push] Notification.permission =', Notification.permission);
    // Only auto-run if permission is already granted (no popup needed)
    if (Notification.permission === 'granted') {
      subscribe();
    }
    // If permission is 'default' or 'denied', wait for the user to click Enable
  }, []);

  return { status, subscribe };
}
