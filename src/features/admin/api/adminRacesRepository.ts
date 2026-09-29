import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import {
  ADMIN_CACHE_KEYS,
  readAdminCache,
  writeAdminCache,
  type AdminCacheReadOptions
} from '../lib/adminCache';
import type {
  AdminEventTrack,
  AdminRaceEvent,
  AdminRaceStatus,
  AdminRaceSummary
} from '../model/types';

export const ADMIN_PAGE_SIZE = 10;

export interface AdminPageResult<T> {
  items: T[];
  hasMore: boolean;
  cursor: QueryDocumentSnapshot<DocumentData> | null;
}

function toRaceStatus(value: unknown): AdminRaceStatus {
  if (value === 'active' || value === 'completed' || value === 'upcoming') {
    return value;
  }
  return 'unknown';
}

function parseDistanceMiles(data: DocumentData): number | null {
  if (typeof data.distanceMiles === 'number' && Number.isFinite(data.distanceMiles)) {
    return data.distanceMiles;
  }
  const distance = data.distance;
  if (distance && typeof distance === 'object') {
    const value = Number((distance as { value?: unknown }).value);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return null;
}

export function mapRaceFromDoc(id: string, data: DocumentData): AdminRaceSummary {
  return {
    id,
    raceName:
      typeof data.raceName === 'string' && data.raceName.trim()
        ? data.raceName.trim()
        : 'Untitled race',
    raceDate: typeof data.raceDate === 'string' ? data.raceDate : '',
    status: toRaceStatus(data.status),
    userId: typeof data.userId === 'string' ? data.userId : '',
    distanceMiles: parseDistanceMiles(data),
    messageTriggerType:
      typeof data.messageTriggerType === 'string' ? data.messageTriggerType : null,
    eventCode:
      typeof data.eventCode === 'string' && data.eventCode.trim()
        ? data.eventCode.trim().toUpperCase()
        : null,
    runnerUsername: null,
    runnerFullName: null,
    runnerEmail: null,
    runnerRelayPlus: null,
    runnerUserMissing: false
  };
}

function mapTrack(raw: unknown): AdminEventTrack | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const track = raw as Record<string, unknown>;
  if (
    typeof track.id !== 'string' ||
    typeof track.name !== 'string' ||
    typeof track.artist !== 'string'
  ) {
    return null;
  }
  return {
    id: track.id,
    name: track.name,
    artist: track.artist,
    previewUrl: typeof track.previewUrl === 'string' ? track.previewUrl : null,
    albumArtUrl: typeof track.albumArtUrl === 'string' ? track.albumArtUrl : null
  };
}

function mapEvent(id: string, data: DocumentData): AdminRaceEvent {
  const type =
    data.type === 'voice' || data.type === 'text' || data.type === 'song'
      ? data.type
      : 'unknown';

  let createdAtMs: number | null = null;
  const createdAt = data.createdAt;
  if (
    createdAt &&
    typeof createdAt === 'object' &&
    'toMillis' in createdAt &&
    typeof (createdAt as { toMillis?: unknown }).toMillis === 'function'
  ) {
    createdAtMs = (createdAt as { toMillis: () => number }).toMillis();
  }

  return {
    id,
    type,
    fromName: typeof data.fromName === 'string' ? data.fromName : '',
    runnerName: typeof data.runnerName === 'string' ? data.runnerName : '',
    deliverMode: typeof data.deliverMode === 'string' ? data.deliverMode : '',
    mileTrigger: typeof data.mileTrigger === 'number' ? data.mileTrigger : null,
    timeTrigger: typeof data.timeTrigger === 'number' ? data.timeTrigger : null,
    textContent: typeof data.textContent === 'string' ? data.textContent : null,
    mediaUrl: typeof data.mediaUrl === 'string' ? data.mediaUrl : null,
    track: mapTrack(data.track),
    createdAtMs,
    source: typeof data.source === 'string' ? data.source : null,
    broadcastMessageId:
      typeof data.broadcastMessageId === 'string' ? data.broadcastMessageId : null
  };
}

export function toPageResult<T>(
  docs: QueryDocumentSnapshot<DocumentData>[],
  pageSize: number,
  mapItem: (snap: QueryDocumentSnapshot<DocumentData>) => T
): AdminPageResult<T> {
  const pageDocs = docs.slice(0, pageSize);
  const hasMore = docs.length > pageSize;
  const last = pageDocs[pageDocs.length - 1] ?? null;

  return {
    items: pageDocs.map(mapItem),
    hasMore,
    cursor: last
  };
}

export async function enrichAdminRacesWithRunners(
  firebaseCtx: FirebaseContext,
  races: AdminRaceSummary[]
): Promise<AdminRaceSummary[]> {
  const uniqueUserIds = [
    ...new Set(races.map((race) => race.userId).filter((id) => id.length > 0))
  ];

  const profiles = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      try {
        const snap = await getDoc(doc(firebaseCtx.db, 'users', userId));
        if (!snap.exists()) {
          return [userId, null] as const;
        }
        const data = snap.data();
        return [
          userId,
          {
            username: typeof data.username === 'string' ? data.username : '',
            fullName: typeof data.fullName === 'string' ? data.fullName : '',
            email: typeof data.email === 'string' ? data.email : null,
            relayPlus: data.relayPlus === true
          }
        ] as const;
      } catch {
        return [userId, null] as const;
      }
    })
  );

  const byUserId = new Map(profiles);

  return races.map((race) => {
    const profile = byUserId.get(race.userId);
    if (!profile) {
      return {
        ...race,
        runnerUserMissing: race.userId.length > 0
      };
    }

    return {
      ...race,
      runnerUsername: profile.username || null,
      runnerFullName: profile.fullName || null,
      runnerEmail: profile.email,
      runnerRelayPlus: profile.relayPlus,
      runnerUserMissing: false
    };
  });
}

export async function fetchAdminRaceById(
  firebaseCtx: FirebaseContext,
  raceId: string,
  options?: AdminCacheReadOptions
): Promise<AdminRaceSummary | null> {
  const id = raceId.trim();
  if (!id) {
    return null;
  }
  return readAdminCache(
    ADMIN_CACHE_KEYS.race(id),
    async () => {
      const snap = await getDoc(doc(firebaseCtx.db, 'races', id));
      if (!snap.exists()) {
        return null;
      }
      return mapRaceFromDoc(snap.id, snap.data());
    },
    options
  );
}

async function listRecentAdminRacesPageUncached(
  firebaseCtx: FirebaseContext,
  pageSize: number,
  cursor: QueryDocumentSnapshot<DocumentData> | null
): Promise<AdminPageResult<AdminRaceSummary>> {
  const fetchLimit = pageSize + 1;

  try {
    const racesQuery = cursor
      ? query(
          collection(firebaseCtx.db, 'races'),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(fetchLimit)
        )
      : query(
          collection(firebaseCtx.db, 'races'),
          orderBy('createdAt', 'desc'),
          limit(fetchLimit)
        );
    const snap = await getDocs(racesQuery);
    const page = toPageResult(snap.docs, pageSize, (item) =>
      mapRaceFromDoc(item.id, item.data())
    );
    return {
      ...page,
      items: await enrichAdminRacesWithRunners(firebaseCtx, page.items)
    };
  } catch {
    const racesQuery = cursor
      ? query(
          collection(firebaseCtx.db, 'races'),
          startAfter(cursor),
          limit(fetchLimit)
        )
      : query(collection(firebaseCtx.db, 'races'), limit(fetchLimit));
    const snap = await getDocs(racesQuery);
    const page = toPageResult(snap.docs, pageSize, (item) =>
      mapRaceFromDoc(item.id, item.data())
    );
    return {
      ...page,
      items: await enrichAdminRacesWithRunners(firebaseCtx, page.items)
    };
  }
}

export async function listRecentAdminRacesPage(
  firebaseCtx: FirebaseContext,
  pageSize = ADMIN_PAGE_SIZE,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null,
  options?: AdminCacheReadOptions
): Promise<AdminPageResult<AdminRaceSummary>> {
  if (cursor) {
    return listRecentAdminRacesPageUncached(firebaseCtx, pageSize, cursor);
  }

  const page = await readAdminCache(
    ADMIN_CACHE_KEYS.racesRecent(pageSize),
    () => listRecentAdminRacesPageUncached(firebaseCtx, pageSize, null),
    options
  );
  for (const race of page.items) {
    writeAdminCache(ADMIN_CACHE_KEYS.race(race.id), race);
  }
  return page;
}

async function listAdminRaceEventsPageUncached(
  firebaseCtx: FirebaseContext,
  raceId: string,
  pageSize: number,
  cursor: QueryDocumentSnapshot<DocumentData> | null
): Promise<AdminPageResult<AdminRaceEvent>> {
  const fetchLimit = pageSize + 1;
  const eventsRef = collection(firebaseCtx.db, 'races', raceId, 'events');

  try {
    const eventsQuery = cursor
      ? query(
          eventsRef,
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(fetchLimit)
        )
      : query(eventsRef, orderBy('createdAt', 'desc'), limit(fetchLimit));
    const snap = await getDocs(eventsQuery);
    return toPageResult(snap.docs, pageSize, (item) => mapEvent(item.id, item.data()));
  } catch {
    const eventsQuery = cursor
      ? query(eventsRef, startAfter(cursor), limit(fetchLimit))
      : query(eventsRef, limit(fetchLimit));
    const snap = await getDocs(eventsQuery);
    const sorted = [...snap.docs].sort((a, b) => {
      const aMs = mapEvent(a.id, a.data()).createdAtMs ?? 0;
      const bMs = mapEvent(b.id, b.data()).createdAtMs ?? 0;
      return bMs - aMs;
    });
    return toPageResult(sorted, pageSize, (item) => mapEvent(item.id, item.data()));
  }
}

export async function listAdminRaceEventsPage(
  firebaseCtx: FirebaseContext,
  raceId: string,
  pageSize = ADMIN_PAGE_SIZE,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null,
  options?: AdminCacheReadOptions
): Promise<AdminPageResult<AdminRaceEvent>> {
  if (cursor) {
    return listAdminRaceEventsPageUncached(firebaseCtx, raceId, pageSize, cursor);
  }

  return readAdminCache(
    ADMIN_CACHE_KEYS.raceEvents(raceId),
    () => listAdminRaceEventsPageUncached(firebaseCtx, raceId, pageSize, null),
    options
  );
}
