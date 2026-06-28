import { initializeApp, getApps } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: "AIzaSyDZZS4iVXjvdZ88rpAga-59k1hcVEmdKHA",
  authDomain: "fitwithpk-8d860.firebaseapp.com",
  projectId: "fitwithpk-8d860",
  storageBucket: "fitwithpk-8d860.firebasestorage.app",
  messagingSenderId: "1027635962068",
  appId: "1:1027635962068:web:55345314557de67a27db41",
};


// Prevent double-initialisation in strict mode / hot reload
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const messaging = getMessaging(app);
console.log('Firebase initialized:', app.name, app.options);
console.log('Firebase messaging initialized:', messaging);

// FCM Web Push certificate (VAPID key pair from Firebase Console → Cloud Messaging)
export const FCM_VAPID_KEY =
  'BDpySW_rIa5e4b_9RwsaMr1fbv0tSMY2UZQybeNjIxkSPmT2BTYkiriQzvDlqQ9RTjPBEknWxuz03X0lECmj4L8';

