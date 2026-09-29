import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint
} from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import {
  ADMIN_CACHE_KEYS,
  readAdminCache,
  writeAdminCache
} from '../lib/adminCache';
import type { AdminRaceSearchMode, AdminRaceSummary } from '../model/types';
import {
  ADMIN_PAGE_SIZE,
  enrichAdminRacesWithRunners,
  fetchAdminRaceById,
  listRecentAdminRacesPage,
  mapRaceFromDoc
} from './adminRacesRepository';
import { filterAdminRace } from '../lib/adminTableFilter';
import { scanFirestoreCollection } from '../lib/adminScanCollection';

function dayBoundsIso(dateInput: string): { startIso: string; endIso: string } | null {
  const trimmed = dateInput.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const start = new Date(`${trimmed}T00:00:00.000`);
  const end = new Date(`${trimmed}T00:00:00.000`);
  end.setDate(end.getDate() + 1);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

async function resolveUserIdByUsername(
  firebaseCtx: FirebaseContext,
  username: string
): Promise<string | null> {
  const key = username.trim().replace(/^@/, '').toLowerCase();
  if (!key) {
    return null;
  }

  const snap = await getDoc(doc(firebaseCtx.db, 'usernames', key));
  if (!snap.exists()) {
    return null;
  }

  const userId = snap.data().userId;
  return typeof userId === 'string' && userId.trim() ? userId : null;
}

async function resolveUserIdByEmail(
  firebaseCtx: FirebaseContext,
  email: string
): Promise<string | null> {
  const key = email.trim().toLowerCase();
  if (!key.includes('@')) {
    return null;
  }

  const snap = await getDoc(doc(firebaseCtx.db, 'emails', key));
  if (!snap.exists()) {
    return null;
  }

  const userId = snap.data().userId;
  return typeof userId === 'string' && userId.trim() ? userId : null;
}

async function queryRaces(
  firebaseCtx: FirebaseContext,
  filters: QueryConstraint[],
  ordered: QueryConstraint[],
  pageLimit: number
): Promise<AdminRaceSummary[]> {
  try {
    const snap = await getDocs(
      query(collection(firebaseCtx.db, 'races'), ...filters, ...ordered, limit(pageLimit))
    );
    const races = snap.docs.map((item) => mapRaceFromDoc(item.id, item.data()));
    return enrichAdminRacesWithRunners(firebaseCtx, races);
  } catch {
    // Missing composite index: still return matches unordered.
    const snap = await getDocs(
      query(collection(firebaseCtx.db, 'races'), ...filters, limit(pageLimit))
    );
    const races = snap.docs.map((item) => mapRaceFromDoc(item.id, item.data()));
    return enrichAdminRacesWithRunners(firebaseCtx, races);
  }
}

async function searchAdminRacesUncached(
  firebaseCtx: FirebaseContext,
  mode: AdminRaceSearchMode,
  q: string
): Promise<AdminRaceSummary[]> {

  if (mode === 'raceId') {
    const race = await fetchAdminRaceById(firebaseCtx, q);
    if (!race) {
      return [];
    }
    const [enriched] = await enrichAdminRacesWithRunners(firebaseCtx, [race]);
    return enriched ? [enriched] : [race];
  }

  if (mode === 'eventCode') {
    return queryRaces(
      firebaseCtx,
      [where('eventCode', '==', q.toUpperCase())],
      [orderBy('createdAt', 'desc')],
      50
    );
  }

  if (mode === 'date') {
    const bounds = dayBoundsIso(q);
    if (!bounds) {
      return [];
    }

    return queryRaces(
      firebaseCtx,
      [
        where('raceDate', '>=', bounds.startIso),
        where('raceDate', '<', bounds.endIso)
      ],
      [orderBy('raceDate', 'asc')],
      100
    );
  }

  if (mode === 'username') {
    const userId = await resolveUserIdByUsername(firebaseCtx, q);
    if (!userId) {
      return [];
    }

    return queryRaces(
      firebaseCtx,
      [where('userId', '==', userId)],
      [orderBy('createdAt', 'desc')],
      50
    );
  }

  if (mode === 'userId') {
    return queryRaces(
      firebaseCtx,
      [where('userId', '==', q)],
      [orderBy('createdAt', 'desc')],
      50
    );
  }

  if (mode === 'email') {
    const userId = await resolveUserIdByEmail(firebaseCtx, q);
    if (!userId) {
      return [];
    }

    return queryRaces(
      firebaseCtx,
      [where('userId', '==', userId)],
      [orderBy('createdAt', 'desc')],
      50
    );
  }

  // Name: scan a larger recent window and filter client-side (no full-text index).
  const page = await listRecentAdminRacesPage(firebaseCtx, 100, null);
  const needle = q.toLowerCase();
  const filtered = page.items.filter((race) =>
    race.raceName.toLowerCase().includes(needle)
  );
  return enrichAdminRacesWithRunners(firebaseCtx, filtered);
}

async function searchAdminRacesLiveUncached(
  firebaseCtx: FirebaseContext,
  rawQuery: string
): Promise<AdminRaceSummary[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  const byId = new Map<string, AdminRaceSummary>();

  const merge = (races: AdminRaceSummary[]): void => {
    for (const race of races) {
      if (filterAdminRace(race, q)) {
        byId.set(race.id, race);
      }
    }
  };

  if (/^\d{4}-\d{2}-\d{2}$/.test(q)) {
    merge(await searchAdminRacesUncached(firebaseCtx, 'date', q));
  }

  const compactCode = q.replace(/\s/g, '');
  if (/^[A-Za-z0-9]{3,24}$/.test(compactCode)) {
    merge(await searchAdminRacesUncached(firebaseCtx, 'eventCode', compactCode));
  }

  merge(await searchAdminRacesUncached(firebaseCtx, 'raceId', q));

  if (q.includes('@')) {
    merge(await searchAdminRacesUncached(firebaseCtx, 'email', q));
  }

  merge(await searchAdminRacesUncached(firebaseCtx, 'username', q));
  merge(await searchAdminRacesUncached(firebaseCtx, 'userId', q));

  const docs = await scanFirestoreCollection(firebaseCtx, 'races');
  const matched = docs
    .map((item) => mapRaceFromDoc(item.id, item.data))
    .filter((race) => filterAdminRace(race, q));
  merge(await enrichAdminRacesWithRunners(firebaseCtx, matched));

  return [...byId.values()].sort((a, b) => b.raceDate.localeCompare(a.raceDate));
}

export async function searchAdminRacesLive(
  firebaseCtx: FirebaseContext,
  rawQuery: string
): Promise<AdminRaceSummary[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  const results = await readAdminCache(
    ADMIN_CACHE_KEYS.racesLiveSearch(q),
    () => searchAdminRacesLiveUncached(firebaseCtx, q)
  );
  for (const race of results) {
    writeAdminCache(ADMIN_CACHE_KEYS.race(race.id), race);
  }
  return results;
}

export async function searchAdminRaces(
  firebaseCtx: FirebaseContext,
  mode: AdminRaceSearchMode,
  rawQuery: string
): Promise<AdminRaceSummary[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  const results = await readAdminCache(
    ADMIN_CACHE_KEYS.racesSearch(mode, q),
    () => searchAdminRacesUncached(firebaseCtx, mode, q)
  );
  for (const race of results) {
    writeAdminCache(ADMIN_CACHE_KEYS.race(race.id), race);
  }
  return results;
}

export { ADMIN_PAGE_SIZE };
