const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface OrganizerCacheEntry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, OrganizerCacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export const ORGANIZER_CACHE_KEYS = {
  eventsList: (organizerId: string) => `organizerEvents:list:${organizerId.trim()}`,
  event: (eventId: string) => `organizerEvents:item:${eventId.trim()}`,
  participants: (eventCode: string) =>
    `organizerEvents:participants:${eventCode.trim().toUpperCase()}`,
  participantsSearch: (eventCode: string, query: string) =>
    `organizerEvents:participantsSearch:${eventCode.trim().toUpperCase()}:${query.trim().toLowerCase()}`,
  participantsCount: (eventCode: string) =>
    `organizerEvents:participantsCount:${eventCode.trim().toUpperCase()}`,
  broadcastMessages: (eventId: string) =>
    `organizerEvents:broadcastMessages:${eventId.trim()}`,
  eventDeliveryStats: (eventCode: string) =>
    `organizerEvents:deliveryStats:${eventCode.trim().toUpperCase()}`
} as const;

export interface OrganizerCacheReadOptions {
  force?: boolean;
  ttlMs?: number;
}

export function peekOrganizerCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) {
      store.delete(key);
    }
    return null;
  }
  return entry.value as T;
}

export function writeOrganizerCache<T>(
  key: string,
  value: T,
  ttlMs = DEFAULT_TTL_MS
): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

export function invalidateOrganizerCache(prefix?: string): void {
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

export function clearOrganizerCache(): void {
  invalidateOrganizerCache();
}

export async function readOrganizerCache<T>(
  key: string,
  loader: () => Promise<T>,
  options?: OrganizerCacheReadOptions
): Promise<T> {
  if (!options?.force) {
    const cached = peekOrganizerCache<T>(key);
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
      writeOrganizerCache(key, value, options?.ttlMs);
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
