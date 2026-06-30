/**
 * Shared IndexedDB store for notifications + pending navigation.
 * Accessible from both the service worker (sw.ts) and the app (use-notifications.ts).
 */

const DB_NAME = 'pk-notifications';
const DB_VERSION = 2;
const STORE = 'notifications';
const NAV_STORE = 'pending-nav';

export interface StoredNotif {
  id: string;
  title: string;
  body: string;
  receivedAt: number;
  read: boolean;
  url?: string;   // destination page when notification is tapped
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(NAV_STORE)) {
        db.createObjectStore(NAV_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Pending navigation (written by SW, consumed once by app) ─────────────────

export async function idbSetPendingNav(url: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NAV_STORE, 'readwrite');
    tx.objectStore(NAV_STORE).put(url, 'url');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbConsumePendingNav(): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NAV_STORE, 'readwrite');
    const store = tx.objectStore(NAV_STORE);
    const getReq = store.get('url');
    getReq.onsuccess = () => {
      const url = getReq.result ?? null;
      if (url) store.delete('url');
      resolve(url);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function idbSave(notif: StoredNotif): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(notif);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbLoadAll(): Promise<StoredNotif[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result ?? []).sort((a, b) => b.receivedAt - a.receivedAt));
    req.onerror = () => reject(req.error);
  });
}

export async function idbMarkAllRead(): Promise<void> {
  const db = await openDB();
  const all = await idbLoadAll();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    all.forEach(n => store.put({ ...n, read: true }));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbClearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
