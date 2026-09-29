import {
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Firestore
} from 'firebase/firestore';

export const PLATFORM_LIFETIME_STATS_COLLECTION = 'platformStats';
export const PLATFORM_LIFETIME_STATS_DOC_ID = 'lifetime';

export const PLATFORM_LIFETIME_STAT_KEYS = {
  organizers: 'organizersCreated',
  eventCodes: 'eventCodesCreated',
  users: 'usersCreated',
  races: 'racesCreated',
  messages: 'messagesCreated'
} as const;

export type PlatformLifetimeStatKey =
  (typeof PLATFORM_LIFETIME_STAT_KEYS)[keyof typeof PLATFORM_LIFETIME_STAT_KEYS];

export interface PlatformLifetimeStats {
  organizersCreated: number;
  eventCodesCreated: number;
  usersCreated: number;
  racesCreated: number;
  messagesCreated: number;
}

function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

export function emptyPlatformLifetimeStats(): PlatformLifetimeStats {
  return {
    organizersCreated: 0,
    eventCodesCreated: 0,
    usersCreated: 0,
    racesCreated: 0,
    messagesCreated: 0
  };
}

export function mapPlatformLifetimeStats(data: unknown): PlatformLifetimeStats {
  if (data == null || typeof data !== 'object') {
    return emptyPlatformLifetimeStats();
  }

  const record = data as Record<string, unknown>;
  return {
    organizersCreated: toCount(record[PLATFORM_LIFETIME_STAT_KEYS.organizers]),
    eventCodesCreated: toCount(record[PLATFORM_LIFETIME_STAT_KEYS.eventCodes]),
    usersCreated: toCount(record[PLATFORM_LIFETIME_STAT_KEYS.users]),
    racesCreated: toCount(record[PLATFORM_LIFETIME_STAT_KEYS.races]),
    messagesCreated: toCount(record[PLATFORM_LIFETIME_STAT_KEYS.messages])
  };
}

function lifetimeStatsRef(db: Firestore) {
  return doc(db, PLATFORM_LIFETIME_STATS_COLLECTION, PLATFORM_LIFETIME_STATS_DOC_ID);
}

export async function fetchPlatformLifetimeStats(
  db: Firestore
): Promise<PlatformLifetimeStats> {
  const snap = await getDoc(lifetimeStatsRef(db));
  if (!snap.exists()) {
    return emptyPlatformLifetimeStats();
  }
  return mapPlatformLifetimeStats(snap.data());
}

export async function incrementPlatformLifetimeStat(
  db: Firestore,
  key: PlatformLifetimeStatKey,
  amount = 1
): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return;
  }

  try {
    await setDoc(
      lifetimeStatsRef(db),
      {
        [key]: increment(amount),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error: unknown) {
    console.error('[Relay] Platform lifetime stat increment failed', {
      key,
      amount,
      error
    });
  }
}

export async function persistPlatformLifetimeHighWater(
  db: Firestore,
  live: PlatformLifetimeStats
): Promise<PlatformLifetimeStats> {
  return runTransaction(db, async (transaction) => {
    const ref = lifetimeStatsRef(db);
    const snap = await transaction.get(ref);
    const stored = snap.exists()
      ? mapPlatformLifetimeStats(snap.data())
      : emptyPlatformLifetimeStats();
    const merged: PlatformLifetimeStats = {
      organizersCreated: Math.max(stored.organizersCreated, live.organizersCreated),
      eventCodesCreated: Math.max(stored.eventCodesCreated, live.eventCodesCreated),
      usersCreated: Math.max(stored.usersCreated, live.usersCreated),
      racesCreated: Math.max(stored.racesCreated, live.racesCreated),
      messagesCreated: Math.max(stored.messagesCreated, live.messagesCreated)
    };

    if (
      merged.organizersCreated === stored.organizersCreated &&
      merged.eventCodesCreated === stored.eventCodesCreated &&
      merged.usersCreated === stored.usersCreated &&
      merged.racesCreated === stored.racesCreated &&
      merged.messagesCreated === stored.messagesCreated &&
      snap.exists()
    ) {
      return merged;
    }

    transaction.set(
      ref,
      {
        ...merged,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    return merged;
  });
}
