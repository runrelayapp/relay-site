import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User
} from 'firebase/auth';
import { getFirebaseContext } from '@/shared/firebase';
import { fetchOrganizerProfileForUser } from '../lib/organizerAuth';
import { clearOrganizerCache } from '../lib/organizerCache';
import type { OrganizerProfile } from '../model/types';

export type OrganizerSessionStatus =
  | 'loading'
  | 'signedOut'
  | 'forbidden'
  | 'ready'
  | 'unavailable';

export interface OrganizerSession {
  status: OrganizerSessionStatus;
  user: User | null;
  profile: OrganizerProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOutOrganizer: () => Promise<void>;
}

export function useOrganizerSession(): OrganizerSession {
  const firebaseCtx = getFirebaseContext();
  const [status, setStatus] = useState<OrganizerSessionStatus>(
    firebaseCtx ? 'loading' : 'unavailable'
  );
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);

  useEffect(() => {
    if (!firebaseCtx) {
      setStatus('unavailable');
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseCtx.auth, (nextUser) => {
      void (async () => {
        if (!nextUser) {
          clearOrganizerCache();
          setUser(null);
          setProfile(null);
          setStatus('signedOut');
          return;
        }

        setStatus('loading');
        const nextProfile = await fetchOrganizerProfileForUser(firebaseCtx, nextUser);

        if (!nextProfile) {
          setUser(nextUser);
          setProfile(null);
          setStatus('forbidden');
          return;
        }

        setUser(nextUser);
        setProfile(nextProfile);
        setStatus('ready');
      })();
    });

    return unsubscribe;
  }, [firebaseCtx]);

  return {
    status,
    user,
    profile,
    async signIn(email: string, password: string): Promise<void> {
      if (!firebaseCtx) {
        throw new Error('Firebase is not configured');
      }

      await signInWithEmailAndPassword(firebaseCtx.auth, email.trim(), password);
    },
    async signOutOrganizer(): Promise<void> {
      if (!firebaseCtx) {
        return;
      }

      await signOut(firebaseCtx.auth);
    }
  };
}
