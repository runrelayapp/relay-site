import { collection, getCountFromServer } from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import {
  ADMIN_CACHE_KEYS,
  readAdminCache,
  type AdminCacheReadOptions
} from '../lib/adminCache';

export interface AdminPlatformCounts {
  organizers: number;
  eventCodes: number;
  users: number;
  races: number;
}

async function countCollection(
  firebaseCtx: FirebaseContext,
  collectionPath: string
): Promise<number> {
  const snap = await getCountFromServer(collection(firebaseCtx.db, collectionPath));
  return snap.data().count;
}

export async function fetchAdminPlatformCounts(
  firebaseCtx: FirebaseContext,
  options?: AdminCacheReadOptions
): Promise<AdminPlatformCounts> {
  return readAdminCache(
    ADMIN_CACHE_KEYS.platformCounts,
    async () => {
      const [organizers, eventCodes, users, races] = await Promise.all([
        countCollection(firebaseCtx, 'organizers'),
        countCollection(firebaseCtx, 'eventCodes'),
        countCollection(firebaseCtx, 'users'),
        countCollection(firebaseCtx, 'races')
      ]);
      return { organizers, eventCodes, users, races };
    },
    options
  );
}
