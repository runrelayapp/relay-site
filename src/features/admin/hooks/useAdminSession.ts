import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User
} from 'firebase/auth';
import { getFirebaseContext, signInWithGoogle as signInWithGoogleAuth } from '@/shared/firebase';
import { clearAdminCache } from '../lib/adminCache';
import { isAdminUser } from '../lib/isAdminUser';

export type AdminSessionStatus =
  | 'loading'
  | 'signedOut'
  | 'forbidden'
  | 'ready'
  | 'unavailable';

export interface AdminSession {
  status: AdminSessionStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutAdmin: () => Promise<void>;
}

export function useAdminSession(): AdminSession {
  const firebaseCtx = getFirebaseContext();
  const [status, setStatus] = useState<AdminSessionStatus>(
    firebaseCtx ? 'loading' : 'unavailable'
  );
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!firebaseCtx) {
      setStatus('unavailable');
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseCtx.auth, (nextUser) => {
      void (async () => {
        if (!nextUser) {
          clearAdminCache();
          setUser(null);
          setStatus('signedOut');
          return;
        }

        setStatus('loading');
        const allowed = await isAdminUser(firebaseCtx, nextUser);

        if (!allowed) {
          setUser(nextUser);
          setStatus('forbidden');
          return;
        }

        setUser(nextUser);
        setStatus('ready');
      })();
    });

    return unsubscribe;
  }, [firebaseCtx]);

  return {
    status,
    user,
    async signIn(email: string, password: string): Promise<void> {
      if (!firebaseCtx) {
        throw new Error('Firebase is not configured');
      }

      await signInWithEmailAndPassword(firebaseCtx.auth, email.trim(), password);
    },
    async signInWithGoogle(): Promise<void> {
      if (!firebaseCtx) {
        throw new Error('Firebase is not configured');
      }

      await signInWithGoogleAuth(firebaseCtx.auth);
    },
    async signOutAdmin(): Promise<void> {
      if (!firebaseCtx) {
        return;
      }

      clearAdminCache();
      await signOut(firebaseCtx.auth);
    }
  };
}
