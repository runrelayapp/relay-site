import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  type Firestore
} from 'firebase/firestore';
import { getAppConfig } from '@/shared/config/env';

export interface FirebaseContext {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  storageBucket: string;
}

let cached: FirebaseContext | null | undefined;

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

  const app = initializeApp(firebase);
  const db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
  });
  const auth = getAuth(app);
  const bucket =
    typeof firebase.storageBucket === 'string' ? firebase.storageBucket.trim() : '';

  cached = {
    app,
    db,
    auth,
    storageBucket: bucket
  };
  return cached;
}
