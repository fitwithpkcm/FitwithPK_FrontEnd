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
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Push notifications not supported on this browser/device');
    return 'unsupported';
  }

  if (VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') {
    console.error('[Push] VAPID public key not configured');
    return 'error';
  }

  // If already denied, the browser will NOT show a dialog — inform the user
  if (Notification.permission === 'denied') {
    console.log('[Push] Permission already denied — user must enable from browser settings');
    return 'denied';
  }

  console.log('[Push] Requesting notification permission, current state:', Notification.permission);
  const permission = await Notification.requestPermission();
  console.log('[Push] Permission result:', permission);

  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') return 'idle';

  const registration = await navigator.serviceWorker.ready;
  console.log('[Push] Service worker ready:', registration);

  // Reuse existing subscription if present
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

export function usePushNotification(): { status: PushStatus; subscribe: () => void } {
  const [status, setStatus] = useState<PushStatus>('idle');

  const subscribe = async () => {
    if (status === 'subscribed' || status === 'subscribing') return;
    setStatus('subscribing');
    try {
      const result = await doSubscribe();
      console.log('[Push] Final status →', result);
      setStatus(result);
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    // Sync the UI with the actual browser permission state on mount
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    // Auto-subscribe if permission already granted (no popup needed)
    if (Notification.permission === 'granted') {
      subscribe();
    }
  }, []);

  return { status, subscribe };
}
