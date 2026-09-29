const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface AdminCacheEntry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, AdminCacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export const ADMIN_CACHE_KEYS = {
  eventCodesList: 'eventCodes:list',
  eventCode: (code: string) => `eventCodes:item:${code}`,
  organizersList: 'organizers:list',
  organizer: (id: string) => `organizers:item:${id}`,
  racesRecent: (pageSize: number) => `races:recent:${pageSize}`,
  racesSearch: (mode: string, query: string) =>
    `races:search:${mode}:${query.trim().toLowerCase()}`,
  race: (id: string) => `races:item:${id}`,
  raceEvents: (id: string) => `races:events:${id}`,
  user: (id: string) => `users:item:${id}`,
  userByUsername: (username: string) =>
    `users:username:${username.trim().replace(/^@/, '').toLowerCase()}`,
  userByEmail: (email: string) => `users:email:${email.trim().toLowerCase()}`,
  usersLastLookup: 'users:lastLookup',
  usersList: 'users:list',
  usersSearch: (query: string) => `users:search:${query.trim().toLowerCase()}`,
  organizersSearch: (query: string) =>
    `organizers:search:${query.trim().toLowerCase()}`,
  eventCodesSearch: (query: string) =>
    `eventCodes:search:${query.trim().toLowerCase()}`,
  racesLiveSearch: (query: string) => `races:liveSearch:${query.trim().toLowerCase()}`,
  overviewMessagesTotal: 'overview:messagesTotal',
  overviewStats: 'overview:lifetimeStats',
  platformCounts: 'overview:platformCounts',
  deliveryStatsByCode: (code: string) =>
    `deliveryStats:code:${code.trim().toUpperCase()}`,
  reviewsSearch: (query: string) => `reviews:search:${query.trim().toLowerCase()}`,
  review: (id: string) => `reviews:item:${id}`
} as const;

export interface AdminCacheReadOptions {
  force?: boolean;
  ttlMs?: number;
}

export function peekAdminCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) {
      store.delete(key);
    }
    return null;
  }
  return entry.value as T;
}

export function writeAdminCache<T>(
  key: string,
  value: T,
  ttlMs = DEFAULT_TTL_MS
): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

export function invalidateAdminCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    inflight.clear();
    return;
  }

  for (const key of [...store.keys()]) {
    if (key === prefix || key.startsWith(prefix)) {
      store.delete(key);
    }
  }
  for (const key of [...inflight.keys()]) {
    if (key === prefix || key.startsWith(prefix)) {
      inflight.delete(key);
    }
  }
}

export function clearAdminCache(): void {
  invalidateAdminCache();
}

export async function readAdminCache<T>(
  key: string,
  loader: () => Promise<T>,
  options?: AdminCacheReadOptions
): Promise<T> {
  if (!options?.force) {
    const cached = peekAdminCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    const pending = inflight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }
  }

  const request = loader()
    .then((value) => {
      writeAdminCache(key, value, options?.ttlMs);
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === request) {
        inflight.delete(key);
      }
    });

  inflight.set(key, request);
  return request;
}
