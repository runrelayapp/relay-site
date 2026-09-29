import { deleteDoc, doc } from 'firebase/firestore';
import { deleteObject, listAll, ref } from 'firebase/storage';
import type { FirebaseContext } from '@/shared/firebase';
import { ADMIN_CACHE_KEYS, invalidateAdminCache } from '../lib/adminCache';

async function deleteEventVoiceStorage(
  firebaseCtx: FirebaseContext,
  raceId: string,
  eventId: string
): Promise<void> {
  const prefix = ref(
    firebaseCtx.storage,
    `races/${raceId}/relay-events/${eventId}`
  );

  try {
    const listing = await listAll(prefix);
    await Promise.all(
      listing.items.map((item) => deleteObject(item).catch(() => undefined))
    );
  } catch {
    // Missing prefix or rules — Firestore delete still proceeds.
  }
}

/**
 * Permanently removes the event document and any voice objects under its path.
 */
export async function permanentlyDeleteAdminEvent(
  firebaseCtx: FirebaseContext,
  raceId: string,
  eventId: string,
  hasVoiceMedia: boolean
): Promise<void> {
  if (hasVoiceMedia) {
    await deleteEventVoiceStorage(firebaseCtx, raceId, eventId);
  }

  await deleteDoc(doc(firebaseCtx.db, 'races', raceId, 'events', eventId));
  invalidateAdminCache(ADMIN_CACHE_KEYS.raceEvents(raceId));
}
