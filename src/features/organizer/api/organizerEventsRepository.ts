import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
  writeBatch,
  documentId,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import { fetchRaceDeliveryStats } from '@/shared/firestore/eventCodeDeliveryStats';
import {
  PLATFORM_LIFETIME_STAT_KEYS,
  incrementPlatformLifetimeStat
} from '@/shared/firestore/platformLifetimeStats';
import { DEFAULT_ORGANIZER_EVENT_MESSAGE_LIMIT } from '@/shared/firestore/eventCodeRegistry';
import { FirebaseError } from 'firebase/app';
import { clampEventDistanceMiles, parseStoredEventDistanceMiles } from '../lib/eventDistance';
import { normalizeEventCode } from '../lib/normalizeEventCode';
import { participantSearchBlob } from '../lib/organizerRunnerUtils';
import {
  invalidateOrganizerCache,
  ORGANIZER_CACHE_KEYS,
  readOrganizerCache,
  writeOrganizerCache,
  type OrganizerCacheReadOptions
} from '../lib/organizerCache';
import type { OrganizerEvent, OrganizerEventParticipant } from '../model/types';

export const ORGANIZER_PARTICIPANTS_PAGE_SIZE = 10;

const RACES_SCAN_BATCH_SIZE = 400;

export interface OrganizerParticipantsPageResult {
  items: OrganizerEventParticipant[];
  hasMore: boolean;
  cursor: QueryDocumentSnapshot<DocumentData> | null;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function toMillis(value: unknown): number | null {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

async function keepEventsWithLiveRegistry(
  firebaseCtx: FirebaseContext,
  events: OrganizerEvent[]
): Promise<OrganizerEvent[]> {
  if (events.length === 0) {
    return events;
  }

  const uniqueCodes = [
    ...new Set(events.map((event) => event.eventCode).filter((code) => code.length > 0))
  ];
  const existing = new Set<string>();

  await Promise.all(
    uniqueCodes.map(async (code) => {
      try {
        const snap = await getDoc(doc(firebaseCtx.db, 'eventCodes', code));
        if (snap.exists()) {
          existing.add(code);
        }
      } catch {
        existing.add(code);
      }
    })
  );

  return events.filter((event) => existing.has(event.eventCode));
}

function mapOrganizerEvent(id: string, data: DocumentData): OrganizerEvent {
  return {
    id,
    organizerId: typeof data.organizerId === 'string' ? data.organizerId : '',
    name: typeof data.name === 'string' ? data.name.trim() : '',
    eventDate: typeof data.eventDate === 'string' ? data.eventDate : '',
    eventCode:
      typeof data.eventCode === 'string' ? normalizeEventCode(data.eventCode) : '',
    distanceMiles: parseStoredEventDistanceMiles(data.distanceMiles),
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt)
  };
}

function randomEventCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function isRetryableCodeCollision(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === 'already-exists';
}

export interface CreateOrganizerEventInput {
  organizerId: string;
  authUid: string;
  organizerName: string;
  organizerEmail: string | null;
  name: string;
  eventDate: string;
  distanceMiles: number;
}

export async function createOrganizerEvent(
  firebaseCtx: FirebaseContext,
  input: CreateOrganizerEventInput
): Promise<OrganizerEvent> {
  const name = input.name.trim();
  const eventDate = input.eventDate.trim();
  const organizerId = input.organizerId.trim();
  const distanceMiles = clampEventDistanceMiles(input.distanceMiles);

  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !organizerId) {
    throw new Error('invalid_event');
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const eventCode = randomEventCode();
    const organizerEventRef = doc(collection(firebaseCtx.db, 'organizerEvents'));
    const eventCodeRef = doc(firebaseCtx.db, 'eventCodes', eventCode);

    const organizerEventPayload = {
      organizerId,
      name,
      eventDate,
      eventCode,
      distanceMiles,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const eventCodePayload = {
      code: eventCode,
      eventName: name,
      organizerDirectoryName: input.organizerName.trim(),
      organizerId,
      organizerName: name,
      organizerUserId: input.authUid,
      organizerEmail: input.organizerEmail?.trim().toLowerCase() || null,
      eventDate,
      distanceMiles,
      messageLimit: DEFAULT_ORGANIZER_EVENT_MESSAGE_LIMIT,
      notes: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      const batch = writeBatch(firebaseCtx.db);
      batch.set(organizerEventRef, organizerEventPayload);
      batch.set(eventCodeRef, eventCodePayload);
      await batch.commit();
      await incrementPlatformLifetimeStat(
        firebaseCtx.db,
        PLATFORM_LIFETIME_STAT_KEYS.eventCodes
      );

      const snap = await getDoc(organizerEventRef);
      const saved = mapOrganizerEvent(snap.id, snap.data() ?? organizerEventPayload);
      invalidateOrganizerCache('organizerEvents:');
      writeOrganizerCache(ORGANIZER_CACHE_KEYS.event(saved.id), saved);
      return saved;
    } catch (error) {
      lastError = error;
      if (!isRetryableCodeCollision(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('event_code_allocation_failed');
}

export async function listOrganizerEvents(
  firebaseCtx: FirebaseContext,
  organizerId: string,
  options?: OrganizerCacheReadOptions
): Promise<OrganizerEvent[]> {
  const id = organizerId.trim();
  if (!id) {
    return [];
  }

  return readOrganizerCache(
    ORGANIZER_CACHE_KEYS.eventsList(id),
    () => listOrganizerEventsUncached(firebaseCtx, id),
    options
  );
}

async function listOrganizerEventsUncached(
  firebaseCtx: FirebaseContext,
  id: string
): Promise<OrganizerEvent[]> {
  try {
    const snap = await getDocs(
      query(
        collection(firebaseCtx.db, 'organizerEvents'),
        where('organizerId', '==', id),
        orderBy('eventDate', 'desc'),
        limit(100)
      )
    );
    return keepEventsWithLiveRegistry(
      firebaseCtx,
      snap.docs.map((item) => mapOrganizerEvent(item.id, item.data()))
    );
  } catch {
    const snap = await getDocs(
      query(
        collection(firebaseCtx.db, 'organizerEvents'),
        where('organizerId', '==', id),
        limit(100)
      )
    );
    return keepEventsWithLiveRegistry(
      firebaseCtx,
      snap.docs
        .map((item) => mapOrganizerEvent(item.id, item.data()))
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
    );
  }
}

export async function fetchOrganizerEvent(
  firebaseCtx: FirebaseContext,
  eventId: string,
  options?: OrganizerCacheReadOptions
): Promise<OrganizerEvent | null> {
  const id = eventId.trim();
  if (!id) {
    return null;
  }

  return readOrganizerCache(
    ORGANIZER_CACHE_KEYS.event(id),
    async () => {
      const snap = await getDoc(doc(firebaseCtx.db, 'organizerEvents', id));
      if (!snap.exists()) {
        return null;
      }
      const [event] = await keepEventsWithLiveRegistry(firebaseCtx, [
        mapOrganizerEvent(snap.id, snap.data())
      ]);
      return event ?? null;
    },
    options
  );
}

function mapRaceRow(data: DocumentData): {
  userId: string;
  raceName: string;
  raceDate: string;
  status: string;
  distanceMiles: number | null;
} {
  let distanceMiles: number | null = null;
  if (typeof data.distanceMiles === 'number' && Number.isFinite(data.distanceMiles)) {
    distanceMiles = data.distanceMiles;
  }

  const statusRaw = data.status;
  const status =
    statusRaw === 'upcoming' ||
    statusRaw === 'active' ||
    statusRaw === 'completed'
      ? statusRaw
      : 'unknown';

  return {
    userId: typeof data.userId === 'string' ? data.userId : '',
    raceName:
      typeof data.raceName === 'string' && data.raceName.trim()
        ? data.raceName.trim()
        : 'Untitled race',
    raceDate: typeof data.raceDate === 'string' ? data.raceDate : '',
    status,
    distanceMiles
  };
}

function displayNameFromProfile(
  fullName: string,
  username: string,
  fallbackRaceName: string
): string {
  const trimmedFull = fullName.trim();
  if (trimmedFull) {
    return trimmedFull;
  }
  const trimmedUser = username.trim();
  if (trimmedUser) {
    return trimmedUser.startsWith('@') ? trimmedUser : `@${trimmedUser}`;
  }
  return fallbackRaceName.trim() || 'Runner';
}

function toParticipantsPageResult(
  docs: QueryDocumentSnapshot<DocumentData>[],
  pageSize: number,
  participants: OrganizerEventParticipant[]
): OrganizerParticipantsPageResult {
  const hasMore = docs.length > pageSize;
  const last = docs[pageSize - 1] ?? docs[docs.length - 1] ?? null;
  return {
    items: participants.slice(0, pageSize),
    hasMore,
    cursor: last
  };
}

async function loadProfilesForUserIds(
  firebaseCtx: FirebaseContext,
  userIds: string[]
): Promise<Map<string, { fullName: string; username: string }>> {
  const profileByUserId = new Map<string, { fullName: string; username: string }>();

  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const userSnap = await getDoc(doc(firebaseCtx.db, 'users', userId));
        if (!userSnap.exists()) {
          return;
        }
        const data = userSnap.data();
        profileByUserId.set(userId, {
          fullName: typeof data.fullName === 'string' ? data.fullName : '',
          username: typeof data.username === 'string' ? data.username : ''
        });
      } catch {
        // skip profile
      }
    })
  );

  return profileByUserId;
}

async function mapRaceDocsToParticipants(
  firebaseCtx: FirebaseContext,
  raceDocs: QueryDocumentSnapshot<DocumentData>[]
): Promise<OrganizerEventParticipant[]> {
  const races = raceDocs.map((item) => ({
    id: item.id,
    ...mapRaceRow(item.data())
  }));
  const userIds = [...new Set(races.map((race) => race.userId).filter((uid) => uid.length > 0))];
  const profileByUserId = await loadProfilesForUserIds(firebaseCtx, userIds);

  const deliveryByRaceId = await Promise.all(
    races.map((race) => fetchRaceDeliveryStats(firebaseCtx, race.id))
  );

  return races.map((race, index) => {
    const profile = profileByUserId.get(race.userId);
    const displayName = displayNameFromProfile(
      profile?.fullName ?? '',
      profile?.username ?? '',
      race.raceName
    );
    const usernameRaw = profile?.username?.trim();
    const delivery = deliveryByRaceId[index];
    return {
      id: race.id,
      displayName,
      username: usernameRaw ? usernameRaw.replace(/^@/, '') : null,
      raceName: race.raceName,
      raceDate: race.raceDate,
      status: race.status,
      distanceMiles: race.distanceMiles,
      supporterCount: delivery?.supporterCount ?? 0,
      messageCount: delivery?.messageCount ?? 0
    };
  });
}

async function fetchAllRaceDocsForEventCode(
  firebaseCtx: FirebaseContext,
  code: string
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const docs: QueryDocumentSnapshot<DocumentData>[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null;

  for (;;) {
    try {
      const pageQuery: Query<DocumentData> = cursor
        ? query(
            collection(firebaseCtx.db, 'races'),
            where('eventCode', '==', code),
            orderBy('createdAt', 'desc'),
            startAfter(cursor),
            limit(RACES_SCAN_BATCH_SIZE)
          )
        : query(
            collection(firebaseCtx.db, 'races'),
            where('eventCode', '==', code),
            orderBy('createdAt', 'desc'),
            limit(RACES_SCAN_BATCH_SIZE)
          );
      const snap = await getDocs(pageQuery);
      if (snap.empty) {
        break;
      }
      docs.push(...snap.docs);
      if (snap.docs.length < RACES_SCAN_BATCH_SIZE) {
        break;
      }
      cursor = snap.docs[snap.docs.length - 1] ?? null;
    } catch {
      let fallbackCursor: QueryDocumentSnapshot<DocumentData> | null = null;
      for (;;) {
        const pageQuery: Query<DocumentData> = fallbackCursor
          ? query(
              collection(firebaseCtx.db, 'races'),
              where('eventCode', '==', code),
              orderBy(documentId()),
              startAfter(fallbackCursor),
              limit(RACES_SCAN_BATCH_SIZE)
            )
          : query(
              collection(firebaseCtx.db, 'races'),
              where('eventCode', '==', code),
              orderBy(documentId()),
              limit(RACES_SCAN_BATCH_SIZE)
            );
        const snap = await getDocs(pageQuery);
        if (snap.empty) {
          break;
        }
        docs.push(...snap.docs);
        if (snap.docs.length < RACES_SCAN_BATCH_SIZE) {
          break;
        }
        fallbackCursor = snap.docs[snap.docs.length - 1] ?? null;
      }
      break;
    }
  }

  return docs;
}

export async function countOrganizerEventParticipants(
  firebaseCtx: FirebaseContext,
  eventCode: string,
  options?: OrganizerCacheReadOptions
): Promise<number> {
  const code = normalizeEventCode(eventCode);
  if (!code) {
    return 0;
  }

  return readOrganizerCache(
    ORGANIZER_CACHE_KEYS.participantsCount(code),
    async () => {
      try {
        const snap = await getCountFromServer(
          query(collection(firebaseCtx.db, 'races'), where('eventCode', '==', code))
        );
        return snap.data().count;
      } catch {
        const docs = await fetchAllRaceDocsForEventCode(firebaseCtx, code);
        return docs.length;
      }
    },
    options
  );
}

export async function listOrganizerEventParticipantsPage(
  firebaseCtx: FirebaseContext,
  eventCode: string,
  pageSize = ORGANIZER_PARTICIPANTS_PAGE_SIZE,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<OrganizerParticipantsPageResult> {
  const code = normalizeEventCode(eventCode);
  if (!code) {
    return { items: [], hasMore: false, cursor: null };
  }

  const fetchLimit = pageSize + 1;

  try {
    const racesQuery = cursor
      ? query(
          collection(firebaseCtx.db, 'races'),
          where('eventCode', '==', code),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(fetchLimit)
        )
      : query(
          collection(firebaseCtx.db, 'races'),
          where('eventCode', '==', code),
          orderBy('createdAt', 'desc'),
          limit(fetchLimit)
        );
    const snap = await getDocs(racesQuery);
    const participants = await mapRaceDocsToParticipants(firebaseCtx, snap.docs);
    return toParticipantsPageResult(snap.docs, pageSize, participants);
  } catch {
    const snap = await getDocs(
      query(
        collection(firebaseCtx.db, 'races'),
        where('eventCode', '==', code),
        limit(fetchLimit)
      )
    );
    const participants = await mapRaceDocsToParticipants(firebaseCtx, snap.docs);
    return toParticipantsPageResult(snap.docs, pageSize, participants);
  }
}

async function searchOrganizerEventParticipantsUncached(
  firebaseCtx: FirebaseContext,
  code: string,
  rawQuery: string
): Promise<OrganizerEventParticipant[]> {
  const q = rawQuery.trim().toLowerCase();
  if (!q) {
    return [];
  }

  const raceDocs = await fetchAllRaceDocsForEventCode(firebaseCtx, code);
  const participants = await mapRaceDocsToParticipants(firebaseCtx, raceDocs);
  return participants.filter((row) => participantSearchBlob(row).includes(q));
}

export async function searchOrganizerEventParticipants(
  firebaseCtx: FirebaseContext,
  eventCode: string,
  rawQuery: string
): Promise<OrganizerEventParticipant[]> {
  const code = normalizeEventCode(eventCode);
  const q = rawQuery.trim();
  if (!code || !q) {
    return [];
  }

  return readOrganizerCache(
    ORGANIZER_CACHE_KEYS.participantsSearch(code, q),
    () => searchOrganizerEventParticipantsUncached(firebaseCtx, code, q)
  );
}

export async function listOrganizerEventParticipants(
  firebaseCtx: FirebaseContext,
  eventCode: string,
  options?: OrganizerCacheReadOptions
): Promise<OrganizerEventParticipant[]> {
  const code = normalizeEventCode(eventCode);
  if (!code) {
    return [];
  }

  return readOrganizerCache(
    ORGANIZER_CACHE_KEYS.participants(code),
    async () => {
      const page = await listOrganizerEventParticipantsPage(
        firebaseCtx,
        code,
        RACES_SCAN_BATCH_SIZE,
        null
      );
      if (page.hasMore) {
        const allDocs = await fetchAllRaceDocsForEventCode(firebaseCtx, code);
        return mapRaceDocsToParticipants(firebaseCtx, allDocs);
      }
      return page.items;
    },
    options
  );
}
