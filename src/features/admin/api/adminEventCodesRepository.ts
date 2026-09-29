import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import {
  ensureOrganizerEventForAdminCode,
  mapEventCodeRegistryFields,
  parseEventCodeMessageLimit,
  syncOrganizerEventMetadataForCode
} from '@/shared/firestore/eventCodeRegistry';
import {
  PLATFORM_LIFETIME_STAT_KEYS,
  incrementPlatformLifetimeStat
} from '@/shared/firestore/platformLifetimeStats';
import {
  ADMIN_CACHE_KEYS,
  invalidateAdminCache,
  readAdminCache,
  writeAdminCache,
  type AdminCacheReadOptions
} from '../lib/adminCache';
import {
  permanentlyDeleteAdminEventCode,
  purgeOrganizerEventsWithoutRegistry
} from './adminDeleteEventCode';

export { purgeOrganizerEventsWithoutRegistry };
import { filterAdminEventCode } from '../lib/adminTableFilter';
import { scanFirestoreCollection } from '../lib/adminScanCollection';
import { fetchAdminOrganizer } from './adminOrganizersRepository';
import type { AdminEventCode } from '../model/types';
import {
  ADMIN_PAGE_SIZE,
  type AdminPageResult,
  toPageResult
} from './adminRacesRepository';

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

function clampAdminEventDistanceMiles(miles: number): number {
  if (!Number.isFinite(miles)) {
    return 26.2;
  }
  const clamped = Math.min(26.2, Math.max(0.1, miles));
  return Math.round(clamped * 10) / 10;
}

function mapEventCode(id: string, data: DocumentData): AdminEventCode {
  const legacyName =
    typeof data.organizerName === 'string' ? data.organizerName.trim() : '';
  const eventName =
    typeof data.eventName === 'string' && data.eventName.trim()
      ? data.eventName.trim()
      : legacyName;
  const registry = mapEventCodeRegistryFields(data);

  return {
    code: id.toUpperCase(),
    eventName,
    organizerDirectoryName:
      typeof data.organizerDirectoryName === 'string'
        ? data.organizerDirectoryName.trim()
        : legacyName,
    organizerId:
      typeof data.organizerId === 'string' && data.organizerId.trim()
        ? data.organizerId.trim()
        : null,
    organizerUserId:
      typeof data.organizerUserId === 'string' && data.organizerUserId.trim()
        ? data.organizerUserId.trim()
        : null,
    organizerEmail:
      typeof data.organizerEmail === 'string' && data.organizerEmail.trim()
        ? data.organizerEmail.trim().toLowerCase()
        : null,
    eventDate: registry.eventDate,
    distanceMiles: registry.distanceMiles,
    messageLimit: registry.messageLimit,
    notes: typeof data.notes === 'string' ? data.notes : '',
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
    organizerName: eventName
  };
}

export function normalizeEventCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '').slice(0, 12);
}

async function listAdminEventCodesUncached(
  firebaseCtx: FirebaseContext
): Promise<AdminEventCode[]> {
  try {
    const snap = await getDocs(
      query(collection(firebaseCtx.db, 'eventCodes'), orderBy('code', 'asc'), limit(500))
    );
    return snap.docs.map((item) => mapEventCode(item.id, item.data()));
  } catch {
    const snap = await getDocs(collection(firebaseCtx.db, 'eventCodes'));
    return snap.docs
      .map((item) => mapEventCode(item.id, item.data()))
      .sort((a, b) => a.code.localeCompare(b.code));
  }
}

export async function listAdminEventCodesPage(
  firebaseCtx: FirebaseContext,
  pageSize = ADMIN_PAGE_SIZE,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<AdminPageResult<AdminEventCode>> {
  const fetchLimit = pageSize + 1;

  try {
    const codesQuery = cursor
      ? query(
          collection(firebaseCtx.db, 'eventCodes'),
          orderBy('code', 'asc'),
          startAfter(cursor),
          limit(fetchLimit)
        )
      : query(
          collection(firebaseCtx.db, 'eventCodes'),
          orderBy('code', 'asc'),
          limit(fetchLimit)
        );
    const snap = await getDocs(codesQuery);
    return toPageResult(snap.docs, pageSize, (item) => mapEventCode(item.id, item.data()));
  } catch {
    const snap = await getDocs(collection(firebaseCtx.db, 'eventCodes'));
    const sortedDocs = [...snap.docs].sort((a, b) =>
      mapEventCode(a.id, a.data()).code.localeCompare(mapEventCode(b.id, b.data()).code)
    );
    let startIndex = 0;
    if (cursor) {
      const index = sortedDocs.findIndex((item) => item.id === cursor.id);
      startIndex = index >= 0 ? index + 1 : 0;
    }
    const pageDocs = sortedDocs.slice(startIndex, startIndex + fetchLimit);
    return toPageResult(pageDocs, pageSize, (item) => mapEventCode(item.id, item.data()));
  }
}

async function searchAdminEventCodesUncached(
  firebaseCtx: FirebaseContext,
  rawQuery: string
): Promise<AdminEventCode[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  const docs = await scanFirestoreCollection(firebaseCtx, 'eventCodes');
  return docs
    .map((item) => mapEventCode(item.id, item.data))
    .filter((item) => filterAdminEventCode(item, q))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function searchAdminEventCodes(
  firebaseCtx: FirebaseContext,
  rawQuery: string
): Promise<AdminEventCode[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  return readAdminCache(ADMIN_CACHE_KEYS.eventCodesSearch(q), () =>
    searchAdminEventCodesUncached(firebaseCtx, q)
  );
}

export async function listAdminEventCodes(
  firebaseCtx: FirebaseContext,
  options?: AdminCacheReadOptions
): Promise<AdminEventCode[]> {
  return readAdminCache(
    ADMIN_CACHE_KEYS.eventCodesList,
    () => listAdminEventCodesUncached(firebaseCtx),
    options
  );
}

export async function fetchAdminEventCode(
  firebaseCtx: FirebaseContext,
  code: string,
  options?: AdminCacheReadOptions
): Promise<AdminEventCode | null> {
  const normalized = normalizeEventCode(code);
  if (!normalized) {
    return null;
  }
  return readAdminCache(
    ADMIN_CACHE_KEYS.eventCode(normalized),
    async () => {
      const snap = await getDoc(doc(firebaseCtx.db, 'eventCodes', normalized));
      if (!snap.exists()) {
        return null;
      }
      return mapEventCode(snap.id, snap.data());
    },
    options
  );
}

export interface UpsertAdminEventCodeInput {
  code: string;
  organizerId: string;
  eventName: string;
  organizerEmail: string;
  eventDate: string;
  distanceMiles: number;
  messageLimit: number;
  notes: string;
}

export interface CreateAdminEventCodeInput extends UpsertAdminEventCodeInput {}

export type UpsertAdminEventCodeError =
  | 'invalid_event_code'
  | 'invalid_organizer_id'
  | 'organizer_not_found'
  | 'organizer_missing_auth'
  | 'event_code_exists'
  | 'invalid_event_details';

export async function createAdminEventCode(
  firebaseCtx: FirebaseContext,
  input: CreateAdminEventCodeInput
): Promise<AdminEventCode> {
  const code = normalizeEventCode(input.code);
  if (!code) {
    throw new Error('invalid_event_code' satisfies UpsertAdminEventCodeError);
  }

  const organizerId = input.organizerId.trim();
  const eventName = input.eventName.trim();
  const eventDate = input.eventDate.trim();

  if (!organizerId || !eventName || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    throw new Error('invalid_event_details' satisfies UpsertAdminEventCodeError);
  }

  const ref = doc(firebaseCtx.db, 'eventCodes', code);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error('event_code_exists' satisfies UpsertAdminEventCodeError);
  }

  const organizer = await fetchAdminOrganizer(firebaseCtx, organizerId, { force: true });
  if (!organizer) {
    throw new Error('organizer_not_found' satisfies UpsertAdminEventCodeError);
  }

  const organizerAuthUid = organizer.authUid ?? organizer.userId;
  if (!organizerAuthUid) {
    throw new Error('organizer_missing_auth' satisfies UpsertAdminEventCodeError);
  }

  const distanceMiles = clampAdminEventDistanceMiles(input.distanceMiles);
  const messageLimit = parseEventCodeMessageLimit(input.messageLimit);

  await ensureOrganizerEventForAdminCode(firebaseCtx, {
    eventCode: code,
    organizerId: organizer.id,
    eventName,
    eventDate,
    distanceMiles
  });

  const payload = {
    code,
    eventName,
    organizerDirectoryName: organizer.name,
    organizerName: eventName,
    organizerId: organizer.id,
    organizerUserId: organizerAuthUid,
    organizerEmail:
      input.organizerEmail.trim().toLowerCase() || organizer.email || null,
    eventDate,
    distanceMiles,
    messageLimit,
    notes: input.notes.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(ref, payload);
  await incrementPlatformLifetimeStat(
    firebaseCtx.db,
    PLATFORM_LIFETIME_STAT_KEYS.eventCodes
  );
  const snap = await getDoc(ref);
  const saved = mapEventCode(snap.id, snap.data() ?? payload);
  invalidateAdminCache('eventCodes:');
  invalidateAdminCache('overview:');
  writeAdminCache(ADMIN_CACHE_KEYS.eventCode(code), saved);
  return saved;
}

export async function upsertAdminEventCode(
  firebaseCtx: FirebaseContext,
  input: UpsertAdminEventCodeInput
): Promise<AdminEventCode> {
  const code = normalizeEventCode(input.code);
  if (!code) {
    throw new Error('invalid_event_code' satisfies UpsertAdminEventCodeError);
  }

  const organizerId = input.organizerId.trim();
  const eventName = input.eventName.trim();
  if (!organizerId || !eventName) {
    throw new Error('invalid_event_details' satisfies UpsertAdminEventCodeError);
  }

  const organizer = await fetchAdminOrganizer(firebaseCtx, organizerId, { force: true });
  if (!organizer) {
    throw new Error('organizer_not_found' satisfies UpsertAdminEventCodeError);
  }

  const organizerAuthUid = organizer.authUid ?? organizer.userId;
  if (!organizerAuthUid) {
    throw new Error('organizer_missing_auth' satisfies UpsertAdminEventCodeError);
  }

  const ref = doc(firebaseCtx.db, 'eventCodes', code);
  const existing = await getDoc(ref);
  const eventDate = input.eventDate.trim();
  const distanceMiles = clampAdminEventDistanceMiles(input.distanceMiles);
  const messageLimit = parseEventCodeMessageLimit(input.messageLimit);

  const payload = {
    code,
    eventName,
    organizerDirectoryName: organizer.name,
    organizerName: eventName,
    organizerId: organizer.id,
    organizerUserId: organizerAuthUid,
    organizerEmail:
      input.organizerEmail.trim().toLowerCase() || organizer.email || null,
    eventDate: /^\d{4}-\d{2}-\d{2}$/.test(eventDate) ? eventDate : null,
    distanceMiles,
    messageLimit,
    notes: input.notes.trim(),
    updatedAt: serverTimestamp(),
    ...(existing.exists() ? {} : { createdAt: serverTimestamp() })
  };

  await setDoc(ref, payload, { merge: true });
  if (!existing.exists()) {
    await incrementPlatformLifetimeStat(
      firebaseCtx.db,
      PLATFORM_LIFETIME_STAT_KEYS.eventCodes
    );
  }

  const resolvedEventDate = /^\d{4}-\d{2}-\d{2}$/.test(eventDate) ? eventDate : '';
  if (resolvedEventDate) {
    await ensureOrganizerEventForAdminCode(firebaseCtx, {
      eventCode: code,
      organizerId: organizer.id,
      eventName,
      eventDate: resolvedEventDate,
      distanceMiles
    });
  }

  if (resolvedEventDate) {
    await syncOrganizerEventMetadataForCode(firebaseCtx, code, {
      name: eventName,
      eventDate: resolvedEventDate,
      distanceMiles
    });
  } else {
    await syncOrganizerEventMetadataForCode(firebaseCtx, code, {
      name: eventName,
      distanceMiles
    });
  }

  const snap = await getDoc(ref);
  const saved = mapEventCode(snap.id, snap.data() ?? payload);
  invalidateAdminCache('eventCodes:');
  invalidateAdminCache('overview:');
  writeAdminCache(ADMIN_CACHE_KEYS.eventCode(code), saved);
  return saved;
}

export async function deleteAdminEventCode(
  firebaseCtx: FirebaseContext,
  code: string
): Promise<void> {
  await permanentlyDeleteAdminEventCode(firebaseCtx, code);
}
