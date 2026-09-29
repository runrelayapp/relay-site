import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { deleteObject, listAll, ref } from 'firebase/storage';
import type { FirebaseContext } from '@/shared/firebase';
import { invalidateEventCodeDeliveryStatsCache } from '@/shared/firestore/eventCodeDeliveryStats';
import { ADMIN_CACHE_KEYS, invalidateAdminCache } from '../lib/adminCache';
import { scanFirestoreCollection } from '../lib/adminScanCollection';

function normalizeEventCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function readEventCodeField(value: unknown): string {
  return typeof value === 'string' ? normalizeEventCode(value) : '';
}

const WRITE_BATCH_LIMIT = 400;
const RACE_CLEAN_CONCURRENCY = 8;

function isOrganizerBroadcastEvent(data: DocumentData): boolean {
  return (
    data.source === 'organizer_broadcast' ||
    (typeof data.broadcastMessageId === 'string' &&
      data.broadcastMessageId.trim().length > 0)
  );
}

async function deleteStoragePrefix(
  firebaseCtx: FirebaseContext,
  path: string
): Promise<void> {
  const prefix = ref(firebaseCtx.storage, path);
  try {
    const listing = await listAll(prefix);
    await Promise.all([
      ...listing.items.map((item) => deleteObject(item).catch(() => undefined)),
      ...listing.prefixes.map((child) =>
        deleteStoragePrefix(firebaseCtx, child.fullPath)
      )
    ]);
  } catch {
    // Missing prefix or rules — Firestore deletes still proceed.
  }
}

async function commitDeletes(
  firebaseCtx: FirebaseContext,
  refs: DocumentReference[]
): Promise<void> {
  for (let index = 0; index < refs.length; index += WRITE_BATCH_LIMIT) {
    const batch = writeBatch(firebaseCtx.db);
    for (const item of refs.slice(index, index + WRITE_BATCH_LIMIT)) {
      batch.delete(item);
    }
    await batch.commit();
  }
}

async function listCollectionDocs(
  firebaseCtx: FirebaseContext,
  path: [string, ...string[]]
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const snap = await getDocs(collection(firebaseCtx.db, ...path));
  return snap.docs;
}

async function addMatchingOrganizerEventIds(
  ids: Set<string>,
  docs: Array<{ id: string; data: DocumentData }>,
  eventCode: string
): Promise<void> {
  for (const item of docs) {
    if (readEventCodeField(item.data.eventCode) === eventCode) {
      ids.add(item.id);
    }
  }
}

async function listOrganizerEventIdsForCode(
  firebaseCtx: FirebaseContext,
  eventCode: string,
  organizerId: string
): Promise<string[]> {
  const ids = new Set<string>();

  try {
    const snap = await getDocs(
      query(
        collection(firebaseCtx.db, 'organizerEvents'),
        where('eventCode', '==', eventCode)
      )
    );
    await addMatchingOrganizerEventIds(
      ids,
      snap.docs.map((item) => ({ id: item.id, data: item.data() })),
      eventCode
    );
  } catch {
    // Fall through to organizer-scoped and full-collection scans.
  }

  if (organizerId) {
    try {
      const snap = await getDocs(
        query(
          collection(firebaseCtx.db, 'organizerEvents'),
          where('organizerId', '==', organizerId)
        )
      );
      await addMatchingOrganizerEventIds(
        ids,
        snap.docs.map((item) => ({ id: item.id, data: item.data() })),
        eventCode
      );
    } catch {
      // Fall through to a full scan.
    }
  }

  if (ids.size === 0) {
    const scanned = await scanFirestoreCollection(firebaseCtx, 'organizerEvents');
    await addMatchingOrganizerEventIds(ids, scanned, eventCode);
  }

  return [...ids];
}

async function listRaceIdsForEventCode(
  firebaseCtx: FirebaseContext,
  eventCode: string
): Promise<string[]> {
  try {
    const snap = await getDocs(
      query(collection(firebaseCtx.db, 'races'), where('eventCode', '==', eventCode))
    );
    return snap.docs.map((item) => item.id);
  } catch {
    const scanned = await scanFirestoreCollection(firebaseCtx, 'races');
    return scanned
      .filter((item) => readEventCodeField(item.data.eventCode) === eventCode)
      .map((item) => item.id);
  }
}

async function mapInChunks<T>(
  items: readonly T[],
  chunkSize: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  for (let index = 0; index < items.length; index += chunkSize) {
    await Promise.all(items.slice(index, index + chunkSize).map(worker));
  }
}

async function deleteOrganizerPortalEvent(
  firebaseCtx: FirebaseContext,
  eventId: string
): Promise<void> {
  await deleteStoragePrefix(firebaseCtx, `organizerEvents/${eventId}`);
  const messageDocs = await listCollectionDocs(firebaseCtx, [
    'organizerEvents',
    eventId,
    'broadcastMessages'
  ]);
  await commitDeletes(
    firebaseCtx,
    messageDocs.map((item) => item.ref)
  );
  await commitDeletes(firebaseCtx, [
    doc(firebaseCtx.db, 'organizerEvents', eventId)
  ]);
}

async function deleteOrganizerBroadcastsOnRace(
  firebaseCtx: FirebaseContext,
  raceId: string
): Promise<void> {
  const eventDocs = await listCollectionDocs(firebaseCtx, [
    'races',
    raceId,
    'events'
  ]);
  const organizerEvents = eventDocs.filter((item) =>
    isOrganizerBroadcastEvent(item.data())
  );

  await Promise.all(
    organizerEvents.map((item) =>
      deleteStoragePrefix(firebaseCtx, `races/${raceId}/relay-events/${item.id}`)
    )
  );
  await commitDeletes(
    firebaseCtx,
    organizerEvents.map((item) => item.ref)
  );
}

async function clearEventCodeOnRaces(
  firebaseCtx: FirebaseContext,
  raceIds: string[]
): Promise<void> {
  for (let index = 0; index < raceIds.length; index += WRITE_BATCH_LIMIT) {
    const batch = writeBatch(firebaseCtx.db);
    for (const raceId of raceIds.slice(index, index + WRITE_BATCH_LIMIT)) {
      batch.update(doc(firebaseCtx.db, 'races', raceId), {
        eventCode: deleteField()
      });
    }
    await batch.commit();
  }
}

/**
 * Removes the event-code registry row and every runner/organizer record
 * that depended on it. Races stay; only the code and organizer messages go.
 */
export async function permanentlyDeleteAdminEventCode(
  firebaseCtx: FirebaseContext,
  code: string
): Promise<void> {
  const normalized = normalizeEventCode(code);
  if (!normalized) {
    return;
  }

  const registrySnap = await getDoc(doc(firebaseCtx.db, 'eventCodes', normalized));
  const organizerId =
    typeof registrySnap.data()?.organizerId === 'string'
      ? registrySnap.data()?.organizerId.trim() ?? ''
      : '';

  const [organizerEventIds, raceIds, broadcastDocs] = await Promise.all([
    listOrganizerEventIdsForCode(firebaseCtx, normalized, organizerId),
    listRaceIdsForEventCode(firebaseCtx, normalized),
    listCollectionDocs(firebaseCtx, ['eventCodes', normalized, 'broadcasts']).catch(
      () => []
    )
  ]);

  await Promise.all(
    organizerEventIds.map((eventId) =>
      deleteOrganizerPortalEvent(firebaseCtx, eventId)
    )
  );
  await commitDeletes(
    firebaseCtx,
    broadcastDocs.map((item) => item.ref)
  );
  await mapInChunks(raceIds, RACE_CLEAN_CONCURRENCY, (raceId) =>
    deleteOrganizerBroadcastsOnRace(firebaseCtx, raceId)
  );
  await clearEventCodeOnRaces(firebaseCtx, raceIds);
  if (registrySnap.exists()) {
    await commitDeletes(firebaseCtx, [registrySnap.ref]);
  }

  invalidateAdminCache('eventCodes:');
  invalidateAdminCache('races:');
  invalidateAdminCache('deliveryStats:');
  invalidateAdminCache(ADMIN_CACHE_KEYS.platformCounts);
  invalidateAdminCache(ADMIN_CACHE_KEYS.overviewMessagesTotal);
  invalidateEventCodeDeliveryStatsCache(normalized);
}

/**
 * Finishes a previous registry-only delete: portal events whose code no
 * longer exists in `eventCodes` are removed the same way as a live delete.
 */
export async function purgeOrganizerEventsWithoutRegistry(
  firebaseCtx: FirebaseContext
): Promise<void> {
  const events = await scanFirestoreCollection(firebaseCtx, 'organizerEvents');
  const codes = [
    ...new Set(
      events
        .map((item) => readEventCodeField(item.data.eventCode))
        .filter((code) => code.length > 0)
    )
  ];

  for (const code of codes) {
    let registryExists = false;
    try {
      const snap = await getDoc(doc(firebaseCtx.db, 'eventCodes', code));
      registryExists = snap.exists();
    } catch {
      registryExists = true;
    }

    if (!registryExists) {
      await permanentlyDeleteAdminEventCode(firebaseCtx, code);
    }
  }
}
