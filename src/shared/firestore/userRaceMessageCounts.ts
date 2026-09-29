import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  query,
  startAfter,
  where,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';

const RACE_ID_PAGE_SIZE = 100;

export async function listAllRaceIdsForUser(
  firebaseCtx: FirebaseContext,
  userId: string
): Promise<string[]> {
  const uid = userId.trim();
  if (!uid) {
    return [];
  }

  const ids: string[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null;

  for (;;) {
    try {
      const pageQuery: Query<DocumentData> = cursor
        ? query(
            collection(firebaseCtx.db, 'races'),
            where('userId', '==', uid),
            startAfter(cursor),
            limit(RACE_ID_PAGE_SIZE)
          )
        : query(
            collection(firebaseCtx.db, 'races'),
            where('userId', '==', uid),
            limit(RACE_ID_PAGE_SIZE)
          );
      const snap = await getDocs(pageQuery);
      if (snap.empty) {
        break;
      }
      ids.push(...snap.docs.map((item) => item.id));
      if (snap.docs.length < RACE_ID_PAGE_SIZE) {
        break;
      }
      cursor = snap.docs[snap.docs.length - 1] ?? null;
    } catch {
      break;
    }
  }

  return ids;
}

export async function countMessagesInRace(
  firebaseCtx: FirebaseContext,
  raceId: string
): Promise<number> {
  const id = raceId.trim();
  if (!id) {
    return 0;
  }

  const eventsRef = collection(firebaseCtx.db, 'races', id, 'events');

  try {
    const snap = await getCountFromServer(eventsRef);
    return snap.data().count;
  } catch {
    const snap = await getDocs(eventsRef);
    return snap.size;
  }
}

export async function countTotalMessagesForUserRaces(
  firebaseCtx: FirebaseContext,
  userId: string
): Promise<number> {
  const raceIds = await listAllRaceIdsForUser(firebaseCtx, userId);
  if (raceIds.length === 0) {
    return 0;
  }

  const counts = await Promise.all(
    raceIds.map((raceId) => countMessagesInRace(firebaseCtx, raceId))
  );
  return counts.reduce((sum, count) => sum + count, 0);
}
