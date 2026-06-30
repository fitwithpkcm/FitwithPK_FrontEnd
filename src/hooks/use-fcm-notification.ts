import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, FCM_VAPID_KEY } from '../lib/firebase';
import { httpCall } from '../services/HttpService';
import { API_URL } from '../common/Urls';
import toast from 'react-hot-toast';

export type FcmStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported' | 'error';

async function getFcmToken(): Promise<string | null> {
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, {
    vapidKey: FCM_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  return token ?? null;
}

async function saveTokenToBackend(token: string): Promise<void> {
  await httpCall({
    url: API_URL.SAVE_PUSH_SUBSCRIPTION,
    method: 'post',
    data: { fcmToken: token },
  });
}

export function useFcmNotification(): {
  status: FcmStatus;
  requestPermission: () => Promise<void>;
} {
  // Initialise immediately from the browser's stored permission so the banner
  // never flickers on app open when the user already granted permission.
  const [status, setStatus] = useState<FcmStatus>(() => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'idle';
  });

  const requestPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }
    try {
      setStatus('requesting');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus('denied'); return; }

      const token = await getFcmToken();
      if (!token) { setStatus('error'); return; }

      await saveTokenToBackend(token);
      setStatus('granted');
    } catch (err) {
      console.error('[FCM]', err);
      setStatus('error');
    }
  };

  // Silently refresh token in background when permission is already granted.
  // Does NOT touch status so the banner stays hidden.
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    getFcmToken()
      .then(token => { if (token) saveTokenToBackend(token).catch(() => {}); })
      .catch(() => {});
  }, []);

  // Foreground message handler — show toast
  useEffect(() => {
    const unsub = onMessage(messaging, (payload) => {
      const d     = payload.data ?? {};
      const title = d['title'] ?? payload.notification?.title ?? 'FitwithPK';
      const body  = d['body']  ?? payload.notification?.body  ?? '';
      toast(`${title}${body ? ` — ${body}` : ''}`, { icon: '🔔', duration: 5000 });
    });
    return unsub;
  }, []);

  return { status, requestPermission };
}
