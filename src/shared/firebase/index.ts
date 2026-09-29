import {
  deleteApp,
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions
} from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  terminate,
  type Firestore
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAppConfig } from '@/shared/config/env';

export { signInWithGoogle } from './signInWithGoogle';

export interface FirebaseContext {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  storageBucket: string;
}

let cached: FirebaseContext | null | undefined;

function getOrCreateApp(options: FirebaseOptions): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(options);
}

function getOrCreateFirestore(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true
    });
  } catch {
    return getFirestore(app);
  }
}

export function getFirebaseContext(): FirebaseContext | null {
  if (cached !== undefined) {
    return cached;
  }

  const config = getAppConfig();
  const { firebase } = config;
  if (!firebase.apiKey || !firebase.appId) {
    cached = null;
    return cached;
  }

  try {
    const app = getOrCreateApp(firebase);
    const db = getOrCreateFirestore(app);
    const auth = getAuth(app);
    const bucket =
      typeof firebase.storageBucket === 'string' ? firebase.storageBucket.trim() : '';
    const storage = getStorage(app, bucket ? `gs://${bucket}` : undefined);

    cached = {
      app,
      db,
      auth,
      storage,
      storageBucket: bucket
    };
    return cached;
  } catch (error) {
    console.error('[relay] firebase init failed', error);
    cached = null;
    return cached;
  }
}

/**
 * Tears down Firestore and the default app so the next `getFirebaseContext()`
 * can create a live client. Needed after a form submit: "Send another" stays
 * in the SPA and must not reuse a terminated Firestore handle.
 */
export async function disposeFirebaseContext(
  firebaseCtx?: FirebaseContext | null
): Promise<void> {
  const ctx = firebaseCtx ?? cached ?? null;
  cached = undefined;
  if (!ctx) {
    return;
  }

  try {
    await terminate(ctx.db);
  } catch {
    /* already terminated */
  }

  try {
    await deleteApp(ctx.app);
  } catch {
    /* already deleted */
  }
}

/**
 * Drops the memoized context so the next `getFirebaseContext()` builds a fresh
 * client. Prefer `disposeFirebaseContext()` after a Firestore `terminate()`.
 */
export function resetFirebaseContext(): void {
  cached = undefined;
}
