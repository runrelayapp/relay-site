import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  query,
  where,
  type DocumentData
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';

export interface EventCodeDeliveryStats {
  runnerCount: number;
  messageCount: number;
  supporterCount: number;
  runnersWithSupporters: number;
}

export interface RaceDeliveryStats {
  messageCount: number;
  supporterCount: number;
}

function normalizeFromName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

export async function countRacesForEventCode(
  firebaseCtx: FirebaseContext,
  eventCode: string
): Promise<number> {
  const code = eventCode.trim().toUpperCase();
  if (!code) {
    return 0;
  }

  try {
    const snap = await getCountFromServer(
      query(collection(firebaseCtx.db, 'races'), where('eventCode', '==', code))
    );
    return snap.data().count;
  } catch {
    const snap = await getDocs(
      query(collection(firebaseCtx.db, 'races'), where('eventCode', '==', code), limit(500))
    );
    return snap.size;
  }
}

export async function fetchRaceDeliveryStats(
  firebaseCtx: FirebaseContext,
  raceId: string
): Promise<RaceDeliveryStats> {
  const id = raceId.trim();
  if (!id) {
    return { messageCount: 0, supporterCount: 0 };
  }

  try {
    const countSnap = await getCountFromServer(
      collection(firebaseCtx.db, 'races', id, 'events')
    );
    const messageCount = countSnap.data().count;
    if (messageCount === 0) {
      return { messageCount: 0, supporterCount: 0 };
    }
  } catch {
    // fall through to doc scan for supporter names
  }

  const eventsSnap = await getDocs(
    collection(firebaseCtx.db, 'races', id, 'events')
  );
  const supporters = new Set<string>();
  for (const item of eventsSnap.docs) {
    const key = normalizeFromName(item.data().fromName);
    if (key) {
      supporters.add(key);
    }
  }

  return {
    messageCount: eventsSnap.size,
    supporterCount: supporters.size
  };
}

async function fetchEventCodeDeliveryStatsUncached(
  firebaseCtx: FirebaseContext,
  eventCode: string
): Promise<EventCodeDeliveryStats> {
  const code = eventCode.trim().toUpperCase();
  if (!code) {
    return {
      runnerCount: 0,
      messageCount: 0,
      supporterCount: 0,
      runnersWithSupporters: 0
    };
  }

  const racesSnap = await getDocs(
    query(collection(firebaseCtx.db, 'races'), where('eventCode', '==', code))
  );

  const supporters = new Set<string>();
  let messageCount = 0;
  let runnersWithSupporters = 0;

  await Promise.all(
    racesSnap.docs.map(async (raceDoc) => {
      const eventsSnap = await getDocs(
        collection(firebaseCtx.db, 'races', raceDoc.id, 'events')
      );
      if (eventsSnap.size > 0) {
        runnersWithSupporters += 1;
      }
      messageCount += eventsSnap.size;
      for (const eventDoc of eventsSnap.docs) {
        const key = normalizeFromName(eventDoc.data().fromName);
        if (key) {
          supporters.add(key);
        }
      }
    })
  );

  return {
    runnerCount: racesSnap.size,
    messageCount,
    supporterCount: supporters.size,
    runnersWithSupporters
  };
}

export function invalidateEventCodeDeliveryStatsCache(eventCode?: string): void {
  if (!eventCode?.trim()) {
    deliveryStatsCache.clear();
    return;
  }
  deliveryStatsCache.delete(eventCode.trim().toUpperCase());
}

const deliveryStatsCache = new Map<string, Promise<EventCodeDeliveryStats>>();

export interface FetchEventCodeDeliveryStatsOptions {
  force?: boolean;
}

export async function fetchEventCodeDeliveryStats(
  firebaseCtx: FirebaseContext,
  eventCode: string,
  options?: FetchEventCodeDeliveryStatsOptions
): Promise<EventCodeDeliveryStats> {
  const code = eventCode.trim().toUpperCase();
  if (!code) {
    return {
      runnerCount: 0,
      messageCount: 0,
      supporterCount: 0,
      runnersWithSupporters: 0
    };
  }

  if (options?.force) {
    invalidateEventCodeDeliveryStatsCache(code);
  }

  const existing = deliveryStatsCache.get(code);
  if (existing) {
    return existing;
  }

  const request = fetchEventCodeDeliveryStatsUncached(firebaseCtx, code);
  deliveryStatsCache.set(code, request);
  return request;
}

export async function fetchOrganizerEventDateByCode(
  firebaseCtx: FirebaseContext,
  eventCode: string
): Promise<string | null> {
  const code = eventCode.trim().toUpperCase();
  if (!code) {
    return null;
  }

  try {
    const snap = await getDocs(
      query(
        collection(firebaseCtx.db, 'organizerEvents'),
        where('eventCode', '==', code),
        limit(1)
      )
    );
    if (snap.empty) {
      return null;
    }
    const data = snap.docs[0]?.data() as DocumentData | undefined;
    return typeof data?.eventDate === 'string' ? data.eventDate : null;
  } catch {
    return null;
  }
}
