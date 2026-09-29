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
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import {
  countTotalMessagesForUserRaces,
  listAllRaceIdsForUser
} from '@/shared/firestore/userRaceMessageCounts';
import {
  ADMIN_CACHE_KEYS,
  invalidateAdminCache,
  peekAdminCache,
  readAdminCache,
  writeAdminCache,
  type AdminCacheReadOptions
} from '../lib/adminCache';
import { filterAdminUser } from '../lib/adminTableFilter';
import { scanFirestoreCollection } from '../lib/adminScanCollection';
import type { AdminUserSummary } from '../model/types';
import {
  ADMIN_PAGE_SIZE,
  type AdminPageResult,
  toPageResult
} from './adminRacesRepository';

function toMillis(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as Timestamp).toMillis === 'function'
  ) {
    return (value as Timestamp).toMillis();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function mapSocialLinks(
  raw: unknown
): AdminUserSummary['socialLinks'] {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const source = raw as Record<string, unknown>;
  const links: AdminUserSummary['socialLinks'] = {};
  for (const key of ['instagram', 'strava', 'tiktok', 'x', 'website'] as const) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      links[key] = value.trim();
    }
  }
  return links;
}

function mapUser(id: string, data: DocumentData): AdminUserSummary {
  const statsRaw =
    data.stats && typeof data.stats === 'object'
      ? (data.stats as Record<string, unknown>)
      : {};

  return {
    id,
    email: typeof data.email === 'string' ? data.email : null,
    username: typeof data.username === 'string' ? data.username : '',
    fullName: typeof data.fullName === 'string' ? data.fullName : '',
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : null,
    relayPlus: data.relayPlus === true,
    personalBest:
      typeof statsRaw.personalBest === 'string' ? statsRaw.personalBest : '',
    profileRaces:
      typeof statsRaw.races === 'number' && Number.isFinite(statsRaw.races)
        ? statsRaw.races
        : 0,
    profileVoices:
      typeof statsRaw.voices === 'number' && Number.isFinite(statsRaw.voices)
        ? statsRaw.voices
        : 0,
    socialLinks: mapSocialLinks(data.socialLinks),
    updatedAtMs: toMillis(data.updatedAt),
    createdAtMs: toMillis(data.createdAt),
    raceCountTotal: 0,
    raceCountUpcoming: 0,
    raceCountActive: 0,
    raceCountCompleted: 0,
    messageCountTotal: 0,
    firstRaceAtMs: null,
    lastRaceAtMs: null
  };
}

async function enrichUserWithRaceStats(
  firebaseCtx: FirebaseContext,
  user: AdminUserSummary
): Promise<AdminUserSummary> {
  const raceIds = await listAllRaceIdsForUser(firebaseCtx, user.id);

  let raceDocs: DocumentData[] = [];

  if (raceIds.length > 0) {
    const snapshots = await Promise.all(
      raceIds.slice(0, 200).map(async (raceId) => {
        try {
          const snap = await getDoc(doc(firebaseCtx.db, 'races', raceId));
          return snap.exists() ? { ...snap.data(), id: snap.id } : null;
        } catch {
          return null;
        }
      })
    );
    raceDocs = snapshots.filter((item): item is DocumentData & { id: string } => item != null);
  }

  if (raceDocs.length === 0) {
    try {
      const snap = await getDocs(
        query(
          collection(firebaseCtx.db, 'races'),
          where('userId', '==', user.id),
          limit(100)
        )
      );
      raceDocs = snap.docs.map((item) => ({ ...item.data(), id: item.id }));
    } catch {
      raceDocs = [];
    }
  }

  let upcoming = 0;
  let active = 0;
  let completed = 0;
  let firstRaceAtMs: number | null = null;
  let lastRaceAtMs: number | null = null;

  for (const race of raceDocs) {
    const status = race.status;
    if (status === 'upcoming') {
      upcoming += 1;
    } else if (status === 'active') {
      active += 1;
    } else if (status === 'completed') {
      completed += 1;
    }

    const createdAtMs = toMillis(race.createdAt);
    if (createdAtMs != null) {
      if (firstRaceAtMs == null || createdAtMs < firstRaceAtMs) {
        firstRaceAtMs = createdAtMs;
      }
      if (lastRaceAtMs == null || createdAtMs > lastRaceAtMs) {
        lastRaceAtMs = createdAtMs;
      }
    }
  }

  const messageCountTotal = await countTotalMessagesForUserRaces(firebaseCtx, user.id);

  return {
    ...user,
    raceCountTotal: Math.max(raceIds.length, raceDocs.length),
    raceCountUpcoming: upcoming,
    raceCountActive: active,
    raceCountCompleted: completed,
    messageCountTotal,
    firstRaceAtMs,
    lastRaceAtMs,
    createdAtMs: user.createdAtMs ?? firstRaceAtMs
  };
}

export async function enrichAdminUserSummaries(
  firebaseCtx: FirebaseContext,
  users: AdminUserSummary[]
): Promise<AdminUserSummary[]> {
  if (users.length === 0) {
    return [];
  }

  return Promise.all(users.map((user) => enrichUserWithRaceStats(firebaseCtx, user)));
}

export async function fetchAdminUserById(
  firebaseCtx: FirebaseContext,
  userId: string,
  options?: AdminCacheReadOptions
): Promise<AdminUserSummary | null> {
  const id = userId.trim();
  if (!id) {
    return null;
  }
  return readAdminCache(
    ADMIN_CACHE_KEYS.user(id),
    async () => {
      const snap = await getDoc(doc(firebaseCtx.db, 'users', id));
      if (!snap.exists()) {
        return null;
      }
      const base = mapUser(snap.id, snap.data());
      return enrichUserWithRaceStats(firebaseCtx, base);
    },
    options
  );
}

export async function setAdminUserRelayPlus(
  firebaseCtx: FirebaseContext,
  userId: string,
  relayPlus: boolean
): Promise<void> {
  await setDoc(
    doc(firebaseCtx.db, 'users', userId),
    {
      relayPlus,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  const cached = peekAdminCache<AdminUserSummary>(ADMIN_CACHE_KEYS.user(userId));
  if (cached) {
    writeAdminCache(ADMIN_CACHE_KEYS.user(userId), { ...cached, relayPlus });
  }
}

export async function lookupAdminUserIdByUsername(
  firebaseCtx: FirebaseContext,
  username: string
): Promise<string | null> {
  const key = username.trim().replace(/^@/, '').toLowerCase();
  if (!key) {
    return null;
  }
  return readAdminCache(ADMIN_CACHE_KEYS.userByUsername(key), async () => {
    const snap = await getDoc(doc(firebaseCtx.db, 'usernames', key));
    if (!snap.exists()) {
      return null;
    }
    const userId = snap.data().userId;
    return typeof userId === 'string' && userId.trim() ? userId : null;
  });
}

export async function lookupAdminUserIdByEmail(
  firebaseCtx: FirebaseContext,
  email: string
): Promise<string | null> {
  const key = email.trim().toLowerCase();
  if (!key.includes('@')) {
    return null;
  }
  return readAdminCache(ADMIN_CACHE_KEYS.userByEmail(key), async () => {
    const snap = await getDoc(doc(firebaseCtx.db, 'emails', key));
    if (!snap.exists()) {
      return null;
    }
    const userId = snap.data().userId;
    return typeof userId === 'string' && userId.trim() ? userId : null;
  });
}

export async function listRecentAdminUsersPage(
  firebaseCtx: FirebaseContext,
  pageSize = ADMIN_PAGE_SIZE,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<AdminPageResult<AdminUserSummary>> {
  const fetchLimit = pageSize + 1;

  try {
    const usersQuery = cursor
      ? query(
          collection(firebaseCtx.db, 'users'),
          orderBy('updatedAt', 'desc'),
          startAfter(cursor),
          limit(fetchLimit)
        )
      : query(
          collection(firebaseCtx.db, 'users'),
          orderBy('updatedAt', 'desc'),
          limit(fetchLimit)
        );
    const snap = await getDocs(usersQuery);
    const page = toPageResult(snap.docs, pageSize, (item) => mapUser(item.id, item.data()));
    return {
      ...page,
      items: await enrichAdminUserSummaries(firebaseCtx, page.items)
    };
  } catch {
    const usersQuery = cursor
      ? query(
          collection(firebaseCtx.db, 'users'),
          startAfter(cursor),
          limit(fetchLimit)
        )
      : query(collection(firebaseCtx.db, 'users'), limit(fetchLimit));
    const snap = await getDocs(usersQuery);
    const page = toPageResult(snap.docs, pageSize, (item) => mapUser(item.id, item.data()));
    return {
      ...page,
      items: await enrichAdminUserSummaries(firebaseCtx, page.items)
    };
  }
}

async function searchAdminUsersUncached(
  firebaseCtx: FirebaseContext,
  rawQuery: string
): Promise<AdminUserSummary[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  const byId = new Map<string, AdminUserSummary>();

  const putUser = (user: AdminUserSummary | null): void => {
    if (user) {
      byId.set(user.id, user);
    }
  };

  const putIfMatches = (user: AdminUserSummary | null): void => {
    if (user && filterAdminUser(user, q)) {
      byId.set(user.id, user);
    }
  };

  if (q.includes('@')) {
    const userId = await lookupAdminUserIdByEmail(firebaseCtx, q);
    if (userId) {
      invalidateAdminCache(ADMIN_CACHE_KEYS.user(userId));
      putUser(await fetchAdminUserById(firebaseCtx, userId, { force: true }));
    }
  }

  const usernameKey = q.replace(/^@/, '').trim();
  if (usernameKey) {
    const userId = await lookupAdminUserIdByUsername(firebaseCtx, usernameKey);
    if (userId) {
      invalidateAdminCache(ADMIN_CACHE_KEYS.user(userId));
      putUser(await fetchAdminUserById(firebaseCtx, userId, { force: true }));
    }
  }

  if (q.length >= 8 && !q.includes(' ')) {
    invalidateAdminCache(ADMIN_CACHE_KEYS.user(q));
    putUser(await fetchAdminUserById(firebaseCtx, q, { force: true }));
  }

  const docs = await scanFirestoreCollection(firebaseCtx, 'users');
  for (const item of docs) {
    putIfMatches(mapUser(item.id, item.data));
  }

  const users = [...byId.values()].sort(
    (a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0)
  );

  return enrichAdminUserSummaries(firebaseCtx, users);
}

export async function searchAdminUsers(
  firebaseCtx: FirebaseContext,
  rawQuery: string
): Promise<AdminUserSummary[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  return readAdminCache(ADMIN_CACHE_KEYS.usersSearch(q), () =>
    searchAdminUsersUncached(firebaseCtx, q)
  );
}

export async function listRecentAdminUsers(
  firebaseCtx: FirebaseContext,
  pageLimit = 100,
  options?: AdminCacheReadOptions
): Promise<AdminUserSummary[]> {
  return readAdminCache(
    ADMIN_CACHE_KEYS.usersList,
    async () => {
      try {
        const snap = await getDocs(
          query(
            collection(firebaseCtx.db, 'users'),
            orderBy('updatedAt', 'desc'),
            limit(pageLimit)
          )
        );
        return snap.docs.map((item) => mapUser(item.id, item.data()));
      } catch {
        const snap = await getDocs(
          query(collection(firebaseCtx.db, 'users'), limit(pageLimit))
        );
        return snap.docs.map((item) => mapUser(item.id, item.data()));
      }
    },
    options
  );
}
