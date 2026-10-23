// ═══════════════════════════════════════════════════════════════
// WEBRING — Firebase / Firestore configuration
// ═══════════════════════════════════════════════════════════════
// Keys come from .env.local (see .env.local.example).
// The site only talks to Firestore when BOTH hold true:
//   1. All NEXT_PUBLIC_FIREBASE_* keys are present
//   2. NEXT_PUBLIC_USE_FIRESTORE=true
// Otherwise every page keeps reading from Sanity (safe fallback),
// so the live site never breaks while the migration is in progress.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when every required Firebase key is present in the env. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.appId,
);

/** Master switch: Firestore becomes the data source only when this is on. */
export const useFirestore =
  isFirebaseConfigured && process.env.NEXT_PUBLIC_USE_FIRESTORE === 'true';

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig as Record<string, string>);
  }
  return app;
}

export function getDb(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!dbInstance) dbInstance = getFirestore(firebaseApp);
  return dbInstance;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!storageInstance) storageInstance = getStorage(firebaseApp);
  return storageInstance;
}
